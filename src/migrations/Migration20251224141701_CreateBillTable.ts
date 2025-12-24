import { Migration } from '@mikro-orm/migrations';

export class Migration20251224141701_CreateBillTable extends Migration {
  override up(): void {
    // Create bills table
    this.addSql(`
      create table "bills" (
        "id" uuid not null default gen_random_uuid(),
        "description" text,
        "marked_name" varchar(255),
        "amount" decimal(19, 2) not null,
        "product_count" integer not null default 1,
        "bill_date" date not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz,
        constraint "bills_pkey" primary key ("id")
      );
    `);

    // Add index on bill_date for better query performance
    this.addSql(`
      create index "bills_bill_date_index" on "bills" ("bill_date");
    `);
  }

  override down(): void {
    this.addSql(`drop index if exists "bills_bill_date_index";`);
    this.addSql(`drop table if exists "bills";`);
  }
}
