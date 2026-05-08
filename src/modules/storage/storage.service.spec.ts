import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { S3StorageService } from './storage.service';
import { createHash } from 'crypto';

jest.setTimeout(120_000);

describe('S3StorageService (integration)', () => {
  let minio: StartedTestContainer;
  let service: S3StorageService;
  const bucket = 'test-bucket';
  const accessKey = 'minioadmin';
  const secretKey = 'minioadmin';

  beforeAll(async () => {
    minio = await new GenericContainer('minio/minio:latest')
      .withEnvironment({
        MINIO_ROOT_USER: accessKey,
        MINIO_ROOT_PASSWORD: secretKey,
      })
      .withCommand(['server', '/data'])
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forHttp('/minio/health/ready', 9000))
      .start();

    const endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
    service = new S3StorageService({
      region: 'us-east-1',
      bucket,
      accessKey,
      secretKey,
      endpoint,
      forcePathStyle: true,
    });
    await service.ensureBucket();
  });

  afterAll(async () => {
    await minio?.stop();
  });

  it('puts an image and returns a content-addressed key', async () => {
    const buf = Buffer.from('fake-png-bytes');
    const expectedHash = createHash('sha256').update(buf).digest('hex');
    const { key } = await service.put(buf, 'image/png');
    expect(key).toBe(`ai/images/${expectedHash}.png`);
    expect(await service.exists(key)).toBe(true);
  });

  it('dedupes when the same buffer is uploaded twice', async () => {
    const buf = Buffer.from('identical-bytes');
    const first = await service.put(buf, 'image/jpeg');
    const second = await service.put(buf, 'image/jpeg');
    expect(first.key).toBe(second.key);
  });

  it('returns false for exists() on a missing key', async () => {
    expect(await service.exists('ai/images/does-not-exist.png')).toBe(false);
  });
});
