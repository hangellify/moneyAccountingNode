import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
