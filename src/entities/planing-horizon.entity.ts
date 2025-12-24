import {
  Entity,
  Property,
  BeforeCreate,
  BeforeUpdate,
  Enum,
  ManyToOne,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Currency } from '../types/currency.enum';
import { PeriodType } from '../types/period-type.enum';
import { Budget } from './budget.entity';
import { Category } from './category.entity';

@Entity({ tableName: 'planing_horizons' })
export class PlaningHorizon extends BaseEntity {
  @Property({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'decimal', precision: 19, scale: 2, nullable: false })
  amount!: number;

  @Enum({
    items: () => Currency,
    type: 'enum',
    nativeEnumName: 'currency_enum',
    nullable: false,
  })
  currency!: Currency;

  @Enum({
    items: () => PeriodType,
    type: 'enum',
    nativeEnumName: 'period_type_enum',
    nullable: false,
  })
  period_type!: PeriodType;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  created_at!: Date;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  updated_at!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  deleted_at?: Date;

  @ManyToOne(() => Budget, { nullable: false })
  budget!: Budget;

  @ManyToMany(() => Category, (category) => category.planingHorizons, {
    owner: true,
    pivotTable: 'planing_horizon_categories',
    joinColumn: 'planing_horizon_id',
    inverseJoinColumn: 'category_id',
  })
  categories = new Collection<Category>(this);

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
