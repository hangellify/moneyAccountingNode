import {
  Entity,
  Property,
  BeforeCreate,
  BeforeUpdate,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { BillSubCategory } from './bill-sub-category.entity';

@Entity({ tableName: 'bills' })
export class Bill extends BaseEntity {
  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'varchar', length: 255, nullable: true })
  marked_name?: string;

  @Property({ type: 'decimal', precision: 19, scale: 2, nullable: false })
  amount!: number;

  @Property({ type: 'integer', nullable: false, default: 1 })
  product_count!: number;

  @Property({ type: 'date', nullable: false })
  bill_date!: Date;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  created_at!: Date;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  updated_at!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  deleted_at?: Date;

  @OneToMany(() => BillSubCategory, (billSubCategory) => billSubCategory.bill)
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
