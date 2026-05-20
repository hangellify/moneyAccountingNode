import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { BudgetModule } from './modules/budget/budget.module';
import { PlaningHorizonModule } from './modules/planing-horizon/planing-horizon.module';
import { CategoryModule } from './modules/category/category.module';
import { SubCategoryModule } from './modules/sub-category/sub-category.module';
import { StorageModule } from './modules/storage/storage.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { AnthropicProvider } from './modules/ai-gateway/providers/anthropic.provider';
import { OpenAiProvider } from './modules/ai-gateway/providers/openai.provider';
import { DeepSeekProvider } from './modules/ai-gateway/providers/deepseek.provider';
import { BillModule } from './modules/bill/bill.module';
import { MarketModule } from './modules/market/market.module';

@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      useFactory: () => ({
        driver: PostgreSqlDriver,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        dbName: process.env.DB_NAME || 'accounting',
        entities: ['./dist/**/*.entity.js'],
        entitiesTs: ['./src/**/*.entity.ts'],
        migrations: {
          path: './src/migrations',
          pathTs: './src/migrations',
          glob: '!(*.d).{js,ts}',
        },
        seeder: {
          path: './src/seeders',
          pathTs: './src/seeders',
          glob: '!(*.d).{js,ts}',
          defaultSeeder: 'DatabaseSeeder',
        },
      }),
    }),
    AuthModule,
    BudgetModule,
    PlaningHorizonModule,
    CategoryModule,
    SubCategoryModule,
    StorageModule,
    AiGatewayModule.forRoot({
      providers: [AnthropicProvider, OpenAiProvider, DeepSeekProvider],
    }),
    BillModule,
    MarketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
