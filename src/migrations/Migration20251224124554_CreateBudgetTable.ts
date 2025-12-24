import { Migration } from '@mikro-orm/migrations';

export class Migration20251224124554_CreateBudgetTable extends Migration {
  override async up(): Promise<void> {
    // Create budgets table
    this.addSql(`
      create table "budgets" (
        "id" uuid not null default gen_random_uuid(),
        "name" varchar(255) not null,
        "description" text,
        "created_at" timestamptz not null default now(),
        "deleted_at" timestamptz,
        constraint "budgets_pkey" primary key ("id")
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "budgets";`);
  }
}

