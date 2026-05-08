import { z } from 'zod';
import type { DiscoveryService } from '@nestjs/core';
import { AiGatewayBootstrapper } from './ai-gateway.module';
import { AiTask } from './types/ai-task';
import { Capability } from './types/capability';
import { LlmProvider, ProviderName } from './types/llm-provider';

function makeProvider(
  name: ProviderName,
  caps: Capability[],
  opts: { configured?: boolean } = {},
): LlmProvider {
  return {
    name,
    capabilities: new Set<Capability>(caps),
    isConfigured: opts.configured ?? true,
    defaultModel: 'fake',
    complete: () => Promise.resolve({ text: '', model: 'fake' }),
    isTransient: () => false,
  };
}

class VisionTask extends AiTask<{ x: number }, { y: number }> {
  readonly name = 'test.vision';
  readonly requiredCapabilities = new Set<Capability>([
    'text',
    'vision',
    'json',
  ]);
  readonly inputSchema = z.object({ x: z.number() });
  readonly outputSchema = z.object({ y: z.number() });
  buildRequest() {
    return Promise.resolve({ messages: [] });
  }
}

class TextTask extends AiTask<{ x: number }, { y: number }> {
  readonly name = 'test.text';
  readonly requiredCapabilities = new Set<Capability>(['text', 'json']);
  readonly inputSchema = z.object({ x: z.number() });
  readonly outputSchema = z.object({ y: z.number() });
  buildRequest() {
    return Promise.resolve({ messages: [] });
  }
}

function makeDiscovery(instances: unknown[]): DiscoveryService {
  return {
    getProviders: () => instances.map((instance) => ({ instance })),
  } as unknown as DiscoveryService;
}

describe('AiGatewayBootstrapper (boot-time capability check)', () => {
  it('boots successfully when every task has a capable configured provider', () => {
    const providers = [
      makeProvider('anthropic', ['text', 'vision', 'json']),
      makeProvider('deepseek', ['text', 'json']),
    ];
    const discovery = makeDiscovery([new VisionTask(), new TextTask()]);
    const bootstrapper = new AiGatewayBootstrapper(discovery, providers);
    expect(() => bootstrapper.onApplicationBootstrap()).not.toThrow();
  });

  it('fails to boot when a task cannot be served by any configured provider', () => {
    const providers = [makeProvider('deepseek', ['text', 'json'])];
    const discovery = makeDiscovery([new VisionTask(), new TextTask()]);
    const bootstrapper = new AiGatewayBootstrapper(discovery, providers);
    expect(() => bootstrapper.onApplicationBootstrap()).toThrow(
      /test\.vision.*vision/,
    );
  });

  it('ignores !isConfigured providers when checking capability', () => {
    const providers = [
      makeProvider('anthropic', ['text', 'vision', 'json'], {
        configured: false,
      }),
      makeProvider('deepseek', ['text', 'json']),
    ];
    const discovery = makeDiscovery([new TextTask()]);
    const bootstrapper = new AiGatewayBootstrapper(discovery, providers);
    expect(() => bootstrapper.onApplicationBootstrap()).not.toThrow();
  });

  it('throws when an unconfigured provider is the only one capable', () => {
    const providers = [
      makeProvider('anthropic', ['text', 'vision', 'json'], {
        configured: false,
      }),
    ];
    const discovery = makeDiscovery([new VisionTask()]);
    const bootstrapper = new AiGatewayBootstrapper(discovery, providers);
    expect(() => bootstrapper.onApplicationBootstrap()).toThrow(/test\.vision/);
  });

  it('ignores non-AiTask providers discovered by DiscoveryService', () => {
    const providers = [makeProvider('deepseek', ['text', 'json'])];
    const discovery = makeDiscovery([
      new TextTask(),
      { not: 'a task' },
      'string-instance',
      null,
      undefined,
    ]);
    const bootstrapper = new AiGatewayBootstrapper(discovery, providers);
    expect(() => bootstrapper.onApplicationBootstrap()).not.toThrow();
  });
});
