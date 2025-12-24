import { Migration } from '@mikro-orm/migrations';

export class Migration20251224130033_CreatePlaningHorizonCategoriesJoinTable extends Migration {
  override up(): void {
    // Create join table for many-to-many relationship
    this.addSql(`
      create table "planing_horizon_categories" (
        "planing_horizon_id" uuid not null,
        "category_id" uuid not null,
        constraint "planing_horizon_categories_pkey" primary key ("planing_horizon_id", "category_id")
      );
    `);

    // Add foreign key constraints
    this.addSql(`
      alter table "planing_horizon_categories" 
      add constraint "planing_horizon_categories_planing_horizon_id_foreign" 
      foreign key ("planing_horizon_id") references "planing_horizons" ("id") on update cascade on delete cascade;
    `);

    this.addSql(`
      alter table "planing_horizon_categories" 
      add constraint "planing_horizon_categories_category_id_foreign" 
      foreign key ("category_id") references "categories" ("id") on update cascade on delete cascade;
    `);

    // Add indexes for better query performance
    this.addSql(`
      create index "planing_horizon_categories_planing_horizon_id_index" 
      on "planing_horizon_categories" ("planing_horizon_id");
    `);

    this.addSql(`
      create index "planing_horizon_categories_category_id_index" 
      on "planing_horizon_categories" ("category_id");
    `);
  }

  override down(): void {
    this.addSql(
      `drop index if exists "planing_horizon_categories_category_id_index";`,
    );
    this.addSql(
      `drop index if exists "planing_horizon_categories_planing_horizon_id_index";`,
    );
    this.addSql(
      `alter table "planing_horizon_categories" drop constraint if exists "planing_horizon_categories_category_id_foreign";`,
    );
    this.addSql(
      `alter table "planing_horizon_categories" drop constraint if exists "planing_horizon_categories_planing_horizon_id_foreign";`,
    );
    this.addSql(`drop table if exists "planing_horizon_categories";`);
  }
}
