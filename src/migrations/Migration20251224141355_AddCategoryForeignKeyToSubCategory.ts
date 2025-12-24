import { Migration } from '@mikro-orm/migrations';

export class Migration20251224141355_AddCategoryForeignKeyToSubCategory extends Migration {
  override up(): void {
    // Add category_id column to sub_categories table
    this.addSql(`
      alter table "sub_categories" 
      add column "category_id" uuid not null;
    `);

    // Add foreign key constraint
    this.addSql(`
      alter table "sub_categories" 
      add constraint "sub_categories_category_id_foreign" 
      foreign key ("category_id") references "categories" ("id") on update cascade on delete restrict;
    `);

    // Add index for better query performance
    this.addSql(`
      create index "sub_categories_category_id_index" on "sub_categories" ("category_id");
    `);
  }

  override down(): void {
    this.addSql(`drop index if exists "sub_categories_category_id_index";`);
    this.addSql(
      `alter table "sub_categories" drop constraint if exists "sub_categories_category_id_foreign";`,
    );
    this.addSql(
      `alter table "sub_categories" drop column if exists "category_id";`,
    );
  }
}
