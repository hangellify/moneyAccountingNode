import { Migration } from '@mikro-orm/migrations';

export class Migration20260519120000_CreateMarketsTable extends Migration {
  override up(): void {
    this.addSql(`
      CREATE TABLE "markets" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "address" VARCHAR(500) NULL,
        "city" VARCHAR(255) NOT NULL,
        "country" VARCHAR(2) NOT NULL,
        "user_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "markets_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "markets_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);
  }

  override down(): void {
    this.addSql(`DROP TABLE IF EXISTS "markets";`);
  }
}
