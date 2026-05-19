import { Migration } from '@mikro-orm/migrations';

export class Migration20260519120001_UpdateBillsTable extends Migration {
  override up(): void {
    this.addSql(`ALTER TABLE "bills" DROP COLUMN IF EXISTS "marked_name";`);
    this.addSql(`ALTER TABLE "bills" DROP COLUMN IF EXISTS "product_count";`);
    this.addSql(`ALTER TABLE "bills" ADD COLUMN "user_id" UUID NOT NULL;`);
    this.addSql(`ALTER TABLE "bills" ADD COLUMN "market_id" UUID NULL;`);
    this.addSql(
      `ALTER TABLE "bills" ADD COLUMN "currency" "currency_enum" NULL;`,
    );
    this.addSql(`
      ALTER TABLE "bills"
        ADD CONSTRAINT "bills_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        ADD CONSTRAINT "bills_market_id_fkey"
          FOREIGN KEY ("market_id") REFERENCES "markets" ("id") ON DELETE SET NULL;
    `);
  }

  override down(): void {
    this.addSql(
      `ALTER TABLE "bills" DROP CONSTRAINT IF EXISTS "bills_user_id_fkey";`,
    );
    this.addSql(
      `ALTER TABLE "bills" DROP CONSTRAINT IF EXISTS "bills_market_id_fkey";`,
    );
    this.addSql(`ALTER TABLE "bills" DROP COLUMN IF EXISTS "user_id";`);
    this.addSql(`ALTER TABLE "bills" DROP COLUMN IF EXISTS "market_id";`);
    this.addSql(`ALTER TABLE "bills" DROP COLUMN IF EXISTS "currency";`);
    this.addSql(
      `ALTER TABLE "bills" ADD COLUMN "marked_name" VARCHAR(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "bills" ADD COLUMN "product_count" INTEGER NOT NULL DEFAULT 1;`,
    );
  }
}
