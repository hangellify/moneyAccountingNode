// src/entities/bill.entity.ts
import {
  Entity,
  Property,
  BeforeCreate,
  BeforeUpdate,
  OneToMany,
  ManyToOne,
  Collection,
  Enum,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { BillSubCategory } from './bill-sub-category.entity';
import { Household } from './household.entity';
import { User } from './user.entity';
import { Market } from './market.entity';
import { Currency } from '../types/currency.enum';
import { BillStatus } from '../types/bill-status.enum';

@Entity({ tableName: 'bills' })
export class Bill extends BaseEntity {
  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'decimal', precision: 19, scale: 2, nullable: false })
  amount!: number;

  @Property({ type: 'date', nullable: false })
  bill_date!: Date;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  created_at!: Date;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  updated_at!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  deleted_at?: Date;

  @Enum({
    items: () => BillStatus,
    type: 'enum',
    nativeEnumName: 'bill_status_enum',
    nullable: false,
    default: BillStatus.CONFIRMED,
  })
  status: BillStatus = BillStatus.CONFIRMED;

  @Property({ type: 'text', nullable: true })
  market_name_raw?: string;

  @ManyToOne(() => Household, { nullable: false })
  household!: Household;

  @ManyToOne(() => User, { nullable: true, deleteRule: 'set null' })
  created_by?: User;

  @ManyToOne(() => Market, { nullable: true })
  market?: Market;

  @Enum({
    items: () => Currency,
    type: 'enum',
    nativeEnumName: 'currency_enum',
    nullable: true,
  })
  currency?: Currency;

  @OneToMany(() => BillSubCategory, (bsc) => bsc.bill)
  billSubCategories = new Collection<BillSubCategory>(this);

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
