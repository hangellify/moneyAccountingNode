import { Migration } from '@mikro-orm/migrations';

export class Migration20260520120000_AddBillDraftSupport extends Migration {
  override up(): void {
    this.addSql(
      `create type "bill_status_enum" as enum ('draft', 'confirmed');`,
    );
    this.addSql(
      `alter table "bills" add column "status" "bill_status_enum" not null default 'confirmed';`,
    );
    this.addSql(`alter table "bills" add column "market_name_raw" text null;`);
    this.addSql(`alter table "markets" alter column "city" drop not null;`);
    this.addSql(`alter table "markets" alter column "country" drop not null;`);
  }

  override down(): void {
    this.addSql(`alter table "bills" drop column "status";`);
    this.addSql(`alter table "bills" drop column "market_name_raw";`);
    this.addSql(`drop type "bill_status_enum";`);
    this.addSql(`alter table "markets" alter column "city" set not null;`);
    this.addSql(`alter table "markets" alter column "country" set not null;`);
  }
}
