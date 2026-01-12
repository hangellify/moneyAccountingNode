import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { TokenResponseDto } from '../src/modules/auth/dto/token-response.dto';

describe('Auth Registration (e2e)', () => {
  let app: INestApplication<App>;
  let testEmail: string;

  beforeEach(async () => {
    // Set required environment variables for tests
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test-jwt-secret-key-minimum-32-characters-long';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET ||
      'test-refresh-secret-key-minimum-32-characters-long';
    process.env.JWT_EXPIRES_IN_MS = process.env.JWT_EXPIRES_IN_MS || '900000';
    process.env.JWT_REFRESH_EXPIRES_IN_MS =
      process.env.JWT_REFRESH_EXPIRES_IN_MS || '604800000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Enable CORS like in main.ts
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Apply global validation pipe like in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Generate unique email for this test run
    testEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should register a new user successfully', async () => {
    const registerDto = {
      email: testEmail,
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto);

    if (response.status !== 201) {
      console.error('Registration failed:', response.status);
      console.error('Response body:', JSON.stringify(response.body, null, 2));
      const errorBody = response.body as { stack?: string };
      if (errorBody?.stack) {
        console.error('Stack trace:', errorBody.stack);
      }
    }

    expect(response.status).toBe(201);

    const body = response.body as TokenResponseDto;

    // Verify response structure
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('refresh_token');
    expect(body).toHaveProperty('expires_in');
    expect(body).toHaveProperty('token_type', 'Bearer');

    // Verify tokens are strings
    expect(typeof body.access_token).toBe('string');
    expect(typeof body.refresh_token).toBe('string');
    expect(body.access_token.length).toBeGreaterThan(0);
    expect(body.refresh_token.length).toBeGreaterThan(0);

    // Verify expires_in is a number
    expect(typeof body.expires_in).toBe('number');
    expect(body.expires_in).toBeGreaterThan(0);
  });
});
