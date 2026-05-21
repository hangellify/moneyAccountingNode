import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AiTask } from './types/ai-task';
import type { LlmProvider } from './types/llm-provider';
import { LLM_PROVIDERS } from './types/llm-provider';
import { LlmRequest } from './types/llm-request';
import { ProviderResolver } from './internal/provider-resolver';
import { AiRequestLogger } from './internal/ai-request-logger';
import { AiRequestStatus } from '../../entities/ai-request.entity';
import {
  AiAttemptStatus,
  AiAttemptErrorCode,
} from '../../entities/ai-request-attempt.entity';
import { AiGatewayExhaustedError, NoCapableProviderError } from './errors';
import { classifyError } from './internal/error-classifier';
import { STORAGE_SERVICE } from '../storage/storage.service';
import type { StorageService } from '../storage/storage.service';

@Injectable()
export class AiGatewayService {
  private readonly log = new Logger(AiGatewayService.name);
  private readonly resolver: ProviderResolver;

  constructor(
    @Inject(LLM_PROVIDERS) providers: LlmProvider[],
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly logger: AiRequestLogger,
  ) {
    this.resolver = new ProviderResolver(
      providers.filter((p) => p.isConfigured),
    );
  }

  async run<In, Out>(
    task: AiTask<In, Out>,
    input: In,
    opts?: { userId?: string },
  ): Promise<Out> {
    // 1. Input validation
    task.inputSchema.parse(input);

    // 2. Build normalized request
    const baseReq = await task.buildRequest(input);

    // 3. Upload any user-message images to S3
    const s3Keys: string[] = [];
    for (const m of baseReq.messages) {
      if (m.role === 'user' && m.images) {
        for (const img of m.images) {
          const { key } = await this.storage.put(img.data, img.mediaType);
          s3Keys.push(key);
        }
      }
    }

    // 4. Compile JSON schema once
    const jsonSchema = z.toJSONSchema(
      task.outputSchema as unknown as Parameters<typeof z.toJSONSchema>[0],
    ) as object;

    // 5. Open audit parent row
    const promptForLog = {
      messages: baseReq.messages.map((m) => ({ role: m.role, text: m.text })),
    };
    const { parentId } = await this.logger.begin({
      taskName: task.name,
      userId: opts?.userId,
      requiredCapabilities: Array.from(task.requiredCapabilities),
      imageS3Keys: s3Keys.length ? s3Keys : undefined,
      prompt: promptForLog,
    });

    // 6. Resolve candidates
    const candidates = this.resolver.candidates(task.requiredCapabilities);
    if (candidates.length === 0) {
      await this.logger.finish({
        parentId,
        status: AiRequestStatus.FAILED,
        errorMessage: 'No capable provider configured',
      });
      throw new NoCapableProviderError(task.name);
    }

    // 7. Loop providers with per-attempt logging and failover
    let lastError: unknown;
    for (let i = 0; i < candidates.length; i++) {
      const provider = candidates[i];
      const model =
        task.modelOverrides?.[provider.name] ?? provider.defaultModel;
      const { attemptId } = await this.logger.beginAttempt({
        parentId,
        providerName: provider.name,
        model,
        attemptNumber: i + 1,
      });
      const t0 = Date.now();
      const req: LlmRequest = {
        ...baseReq,
        jsonSchema,
        modelOverride: model,
      };

      try {
        const res = await provider.complete(req);
        const parsed = task.outputSchema.safeParse(res.json);
        const latencyMs = Date.now() - t0;

        if (!parsed.success) {
          await this.logger.finishAttempt({
            attemptId,
            status: AiAttemptStatus.FAILED,
            errorCode: AiAttemptErrorCode.SCHEMA_INVALID,
            errorMessage: parsed.error.message,
            rawText: res.text,
            inputTokens: res.usage?.inputTokens,
            outputTokens: res.usage?.outputTokens,
            latencyMs,
          });
          lastError = parsed.error;
          continue;
        }

        await this.logger.finishAttempt({
          attemptId,
          status: AiAttemptStatus.SUCCESS,
          rawText: res.text,
          parsedJson: parsed.data,
          inputTokens: res.usage?.inputTokens,
          outputTokens: res.usage?.outputTokens,
          latencyMs,
        });
        await this.logger.finish({
          parentId,
          status: AiRequestStatus.SUCCESS,
          chosenAttemptId: attemptId,
          finalOutput: parsed.data,
        });
        return parsed.data;
      } catch (err) {
        const latencyMs = Date.now() - t0;
        const { code, message } = classifyError(err);
        await this.logger.finishAttempt({
          attemptId,
          status: AiAttemptStatus.FAILED,
          errorCode: code,
          errorMessage: message,
          latencyMs,
        });
        lastError = err;
      }
    }

    await this.logger.finish({
      parentId,
      status: AiRequestStatus.FAILED,
      errorMessage: 'All candidate providers failed',
    });
    this.log.warn(
      `AI gateway exhausted all ${candidates.length} candidate provider(s) for task '${task.name}' (parentId=${parentId})`,
    );
    throw new AiGatewayExhaustedError(parentId, lastError);
  }
}
