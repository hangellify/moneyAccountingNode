import { BillParserTask } from './bill-parser.task';

describe('BillParserTask', () => {
  const t = new BillParserTask();

  it('declares text + vision + json capabilities', () => {
    expect(t.requiredCapabilities.has('vision')).toBe(true);
    expect(t.requiredCapabilities.has('json')).toBe(true);
    expect(t.requiredCapabilities.has('text')).toBe(true);
  });

  it('names itself bill.parse and prefers Claude Sonnet on anthropic', () => {
    expect(t.name).toBe('bill.parse');
    expect(t.modelOverrides?.anthropic).toBe('claude-sonnet-4-6');
  });

  it('produces a user message with the image attached', async () => {
    const buf = Buffer.from('x');
    const req = await t.buildRequest({ image: buf, mediaType: 'image/png' });
    const user = req.messages.find((m) => m.role === 'user');
    expect(user).toBeDefined();
    if (user && user.role === 'user') {
      expect(user.images?.[0].data).toBe(buf);
      expect(user.images?.[0].mediaType).toBe('image/png');
    }
  });

  it('rejects bad input at parse time', () => {
    expect(() =>
      t.inputSchema.parse({ image: 'not a buffer', mediaType: 'image/png' }),
    ).toThrow();
  });
});
