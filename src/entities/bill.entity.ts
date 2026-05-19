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
import { User } from './user.entity';
import { Market } from './market.entity';
import { Currency } from '../types/currency.enum';

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

  @ManyToOne(() => User, { nullable: false })
  user!: User;

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
