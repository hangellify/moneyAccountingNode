import { Entity, Property, BeforeCreate, BeforeUpdate, Enum } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Currency } from '../types/currency.enum';
import { LanguageCode } from '../types/language-code.enum';

@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  @Property({ type: 'varchar', length: 255, nullable: false })
  first_name!: string;

  @Property({ type: 'varchar', length: 255, nullable: true })
  last_name?: string;

  @Property({ type: 'varchar', length: 255, nullable: true })
  username?: string;

  @Enum({
    items: () => LanguageCode,
    type: 'enum',
    nativeEnumName: 'language_code_enum',
    nullable: true,
  })
  language_code?: LanguageCode;

  @Enum({
    items: () => Currency,
    type: 'enum',
    nativeEnumName: 'currency_enum',
    nullable: false,
    default: Currency.EUR,
  })
  currency!: Currency;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  created_at!: Date;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  updated_at!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  deleted_at?: Date;

  @BeforeCreate()
  beforeCreate() {
    this.created_at = new Date();
    this.updated_at = new Date();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updated_at = new Date();
  }
}
