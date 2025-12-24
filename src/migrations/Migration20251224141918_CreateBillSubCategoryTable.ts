import { Migration } from '@mikro-orm/migrations';

export class Migration20251224141918_CreateBillSubCategoryTable extends Migration {
  override async up(): Promise<void> {
    // Create bill_sub_categories table
    this.addSql(`
      create table "bill_sub_categories" (
        "id" uuid not null default gen_random_uuid(),
        "bill_id" uuid not null,
        "sub_category_id" uuid not null,
        "product_count" integer not null default 1,
        "amount" decimal(19, 2) not null,
        "product_weight" decimal(10, 3),
        constraint "bill_sub_categories_pkey" primary key ("id")
      );
    `);

    // Add foreign key constraints
    this.addSql(`
      alter table "bill_sub_categories" 
      add constraint "bill_sub_categories_bill_id_foreign" 
      foreign key ("bill_id") references "bills" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      alter table "bill_sub_categories" 
      add constraint "bill_sub_categories_sub_category_id_foreign" 
      foreign key ("sub_category_id") references "sub_categories" ("id") on update cascade on delete restrict;
    `);

    // Add indexes for better query performance
    this.addSql(`
      create index "bill_sub_categories_bill_id_index" 
      on "bill_sub_categories" ("bill_id");
    `);

    this.addSql(`
      create index "bill_sub_categories_sub_category_id_index" 
      on "bill_sub_categories" ("sub_category_id");
    `);

    // Add unique constraint to ensure one-to-one relationship per bill and sub_category combination
    this.addSql(`
      create unique index "bill_sub_categories_bill_sub_category_unique" 
      on "bill_sub_categories" ("bill_id", "sub_category_id");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "bill_sub_categories_bill_sub_category_unique";`);
    this.addSql(`drop index if exists "bill_sub_categories_sub_category_id_index";`);
    this.addSql(`drop index if exists "bill_sub_categories_bill_id_index";`);
    this.addSql(`alter table "bill_sub_categories" drop constraint if exists "bill_sub_categories_sub_category_id_foreign";`);
    this.addSql(`alter table "bill_sub_categories" drop constraint if exists "bill_sub_categories_bill_id_foreign";`);
    this.addSql(`drop table if exists "bill_sub_categories";`);
  }
}

