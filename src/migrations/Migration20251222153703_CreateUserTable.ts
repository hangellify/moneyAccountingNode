import { Migration } from '@mikro-orm/migrations';

export class Migration20251222153703_CreateUserTable extends Migration {
  override up(): void {
    // Create language_code enum type
    this.addSql(`
      create type "language_code_enum" as enum ('RU', 'EN', 'RO');
    `);

    // Create currency enum type
    this.addSql(`
      create type "currency_enum" as enum (
        'EUR', 'GBP', 'RON', 'PLN', 'MDL', 'CZK', 'HUF', 'BGN', 'HRK', 'DKK', 
        'SEK', 'NOK', 'CHF', 'ISK', 'RSD', 'BAM', 'ALL', 'MKD', 'UAH', 'BYN', 
        'RUB', 'TRY', 'JPY', 'CNY', 'INR', 'KRW', 'THB', 'SGD', 'MYR', 'IDR', 
        'PHP', 'VND', 'HKD', 'TWD', 'PKR', 'BDT', 'LKR', 'NPR', 'MMK', 'KHR', 
        'LAK', 'MNT', 'KZT', 'UZS', 'AZN', 'AMD', 'GEL', 'ILS', 'JOD', 'LBP', 
        'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR', 'IRR', 'IQD', 'ZAR', 'EGP', 
        'NGN', 'KES', 'GHS', 'ETB', 'UGX', 'TZS', 'RWF', 'XOF', 'XAF', 'MAD', 
        'TND', 'DZD', 'LYD', 'AOA', 'MZN', 'ZMW', 'BWP', 'MUR', 'USD', 'CAD', 
        'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'VES', 'UYU', 'PYG', 'BOB', 
        'GTQ', 'HNL', 'NIO', 'CRC', 'PAB', 'DOP', 'HTG', 'JMD', 'BBD', 'BZD', 
        'TTD', 'XCD', 'GYD', 'SRD'
      );
    `);

    // Create users table with currency and language_code enums
    this.addSql(`
      create table "users" (
        "id" uuid not null default gen_random_uuid(),
        "first_name" varchar(255) not null,
        "last_name" varchar(255),
        "username" varchar(255),
        "language_code" language_code_enum,
        "currency" currency_enum not null default 'EUR',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz,
        constraint "users_pkey" primary key ("id")
      );
    `);
  }

  override down(): void {
    this.addSql(`drop table if exists "users";`);
    this.addSql(`drop type if exists "currency_enum";`);
    this.addSql(`drop type if exists "language_code_enum";`);
  }
}
