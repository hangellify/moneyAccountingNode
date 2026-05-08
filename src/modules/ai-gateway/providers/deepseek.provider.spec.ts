/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { DeepSeekProvider } from './deepseek.provider';
import { InvalidResponseError } from '../internal/error-classifier';

const mockCreate = jest.fn();
const mockCtor = jest.fn().mockImplementation(() => ({
  chat: { completions: { create: mockCreate } },
}));
jest.mock('openai', () => ({
  __esModule: true,
  default: function MockOpenAI(...args: unknown[]) {
    return mockCtor(...args);
  },
}));

describe('DeepSeekProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCtor.mockClear();
  });

  it('is disabled when DEEPSEEK_API_KEY is missing', () => {
    delete process.env.DEEPSEEK_API_KEY;
    const p = new DeepSeekProvider();
    expect(p.isConfigured).toBe(false);
  });

  it('exposes only text and json capabilities (no vision)', () => {
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
    const p = new DeepSeekProvider();
    expect(p.capabilities.has('text')).toBe(true);
    expect(p.capabilities.has('json')).toBe(true);
    expect(p.capabilities.has('vision')).toBe(false);
  });

  it('constructs OpenAI SDK with DeepSeek baseURL', () => {
    process.env.DEEPSEEK_API_KEY = 'ds-key';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
    new DeepSeekProvider();
    expect(mockCtor).toHaveBeenCalledWith({
      apiKey: 'ds-key',
      baseURL: 'https://api.deepseek.com',
    });
  });

  it('appends schema to existing system message and sets json_object mode', async () => {
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 3, completion_tokens: 4 },
      model: 'deepseek-chat',
    });
    const p = new DeepSeekProvider();
    const res = await p.complete({
      messages: [
        { role: 'system', text: 'You are helpful.' },
        { role: 'user', text: 'classify' },
      ],
      jsonSchema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    });
    expect(res.json).toEqual({ ok: true });
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.response_format).toEqual({ type: 'json_object' });
    const systemMsg = arg.messages.find((m: any) => m.role === 'system');
    expect(systemMsg.content).toContain('You are helpful.');
    expect(systemMsg.content).toContain('JSON matching this schema');
  });

  it('synthesizes a system message when none is provided', async () => {
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      model: 'deepseek-chat',
    });
    const p = new DeepSeekProvider();
    await p.complete({
      messages: [{ role: 'user', text: 'classify' }],
      jsonSchema: { type: 'object' },
    });
    const arg = mockCreate.mock.calls[0][0];
    const systemMsgs = arg.messages.filter((m: any) => m.role === 'system');
    expect(systemMsgs).toHaveLength(1);
    expect(systemMsgs[0].content).toContain('helpful assistant');
    expect(systemMsgs[0].content).toContain('JSON matching this schema');
  });

  it('throws InvalidResponseError when the body is not valid JSON', async () => {
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not json {' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      model: 'deepseek-chat',
    });
    const p = new DeepSeekProvider();
    await expect(
      p.complete({
        messages: [{ role: 'user', text: 'x' }],
        jsonSchema: { type: 'object' },
      }),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it('classifies 429 as transient and 400 as non-transient', () => {
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
    const p = new DeepSeekProvider();
    expect(p.isTransient({ status: 429 })).toBe(true);
    expect(p.isTransient({ status: 400 })).toBe(false);
    expect(p.isTransient({ status: 503 })).toBe(true);
  });
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
