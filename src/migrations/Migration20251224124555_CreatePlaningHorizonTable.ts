import { Migration } from '@mikro-orm/migrations';

export class Migration20251224124555_CreatePlaningHorizonTable extends Migration {
  override async up(): Promise<void> {
    // Create period_type enum type
    this.addSql(`
      create type "period_type_enum" as enum ('DAILY', 'WEEKLY', 'TWO_WEEKS', 'THREE_WEEKS', 'MONTHLY', 'TWO_MONTHS', 'QUARTERLY', 'SEMI_ANNUAL', 'YEARLY');
    `);

    // Create planing_horizons table
    this.addSql(`
      create table "planing_horizons" (
        "id" uuid not null default gen_random_uuid(),
        "name" varchar(255) not null,
        "description" text,
        "amount" decimal(19, 2) not null,
        "currency" currency_enum not null,
        "period_type" period_type_enum not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz,
        constraint "planing_horizons_pkey" primary key ("id")
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "planing_horizons";`);
    this.addSql(`drop type if exists "period_type_enum";`);
  }
}

