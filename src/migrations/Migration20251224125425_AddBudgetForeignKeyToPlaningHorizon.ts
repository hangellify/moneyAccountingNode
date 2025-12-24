import { Migration } from '@mikro-orm/migrations';

export class Migration20251224125425_AddBudgetForeignKeyToPlaningHorizon extends Migration {
  override up(): void {
    // Add budget_id column to planing_horizons table
    this.addSql(`
      alter table "planing_horizons" 
      add column "budget_id" uuid not null;
    `);

    // Add foreign key constraint
    this.addSql(`
      alter table "planing_horizons" 
      add constraint "planing_horizons_budget_id_foreign" 
      foreign key ("budget_id") references "budgets" ("id") on update cascade on delete restrict;
    `);

    // Add index for better query performance
    this.addSql(`
      create index "planing_horizons_budget_id_index" on "planing_horizons" ("budget_id");
    `);
  }

  override down(): void {
    this.addSql(`drop index if exists "planing_horizons_budget_id_index";`);
    this.addSql(
      `alter table "planing_horizons" drop constraint if exists "planing_horizons_budget_id_foreign";`,
    );
    this.addSql(
      `alter table "planing_horizons" drop column if exists "budget_id";`,
    );
  }
}
