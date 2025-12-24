import { Migration } from '@mikro-orm/migrations';

export class Migration20251224125716_CreateCategoryTable extends Migration {
  override async up(): Promise<void> {
    // Create categories table
    this.addSql(`
      create table "categories" (
        "id" uuid not null default gen_random_uuid(),
        "name" varchar(255) not null,
        "description" text,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz,
        constraint "categories_pkey" primary key ("id")
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "categories";`);
  }
}


