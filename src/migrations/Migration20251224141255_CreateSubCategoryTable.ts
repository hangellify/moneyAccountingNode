import { Migration } from '@mikro-orm/migrations';

export class Migration20251224141255_CreateSubCategoryTable extends Migration {
  override up(): void {
    // Create sub_categories table
    this.addSql(`
      create table "sub_categories" (
        "id" uuid not null default gen_random_uuid(),
        "name" varchar(255) not null,
        "description" text,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz,
        constraint "sub_categories_pkey" primary key ("id")
      );
    `);
  }

  override down(): void {
    this.addSql(`drop table if exists "sub_categories";`);
  }
}
