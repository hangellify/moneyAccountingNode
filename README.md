<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Prerequisites

- Node 22+
- Docker + Docker Compose
- npm

## Initial setup

```bash
# install dependencies
npm install

# create your local env file from the template and fill in secrets
cp .env.example .env

# start Postgres and MinIO in the background
docker compose up -d postgres minio

# apply all pending migrations
npm run migration:up
```

`.env` is already gitignored. At minimum it needs the DB, JWT, and S3 entries. The AI provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`) are optional — any adapter without a key is logged as "skipped" at boot and excluded from capability resolution.

## Compile and run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production build + run
npm run build
npm run start:prod
```

## Run tests

```bash
# unit + mocked-integration suites (fast, no infra)
npm test

# integration specs that require a live Postgres
docker compose up -d postgres
npm test -- src/modules/ai-gateway/internal/ai-request-logger.spec.ts
npm test -- src/modules/ai-gateway/ai-gateway.service.spec.ts

# coverage
npm run test:cov

# e2e
npm run test:e2e
```

`npm test` already sets `NODE_OPTIONS=--experimental-vm-modules` so the AWS SDK v3's dynamic imports load cleanly inside Jest.

## Local test env for smoke-booting the AI gateway

For one-off smoke tests without touching your working `.env`, create `.env.test` (gitignored) with a full set of boot-ready values:

```bash
# DB
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=accounting

# Server
PORT=3333
NODE_ENV=test

# JWT (any string ≥32 chars works for a local smoke test)
JWT_SECRET=test-secret-at-least-32-chars-long-xxxxxx
JWT_EXPIRES_IN_MS=900000
JWT_REFRESH_SECRET=test-refresh-secret-at-least-32-chars-long-xxxxxx
JWT_REFRESH_EXPIRES_IN_MS=604800000

# AI Gateway — any real or fake key enables the adapter (the key is only read
# when an actual call is made; boot-time only checks that it's set)
ANTHROPIC_API_KEY=sk-ant-test
ANTHROPIC_MODEL=claude-sonnet-4-6

# S3 / MinIO
S3_REGION=us-east-1
S3_BUCKET=money-accounting-ai
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
```

Source it and start the app:

```bash
set -a && source .env.test && set +a && npm run start
```

You should see the boot-time capability check output:

```
[AiGatewayModule] Configured providers: anthropic
[AiGatewayModule] Skipped providers (no API key): openai, deepseek
[AiGatewayModule] Task 'bill.parse' can run on: anthropic
[AiGatewayModule] Task 'bill.categorize' can run on: anthropic
[NestApplication] Nest application successfully started
```

If a task has no capable provider configured (e.g. only `DEEPSEEK_API_KEY` is set, but `bill.parse` needs vision), the app refuses to start and throws:

```
Error: No configured AI provider satisfies task 'bill.parse' (required: text, vision, json)
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
