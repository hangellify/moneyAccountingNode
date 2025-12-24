import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Bill } from './bill.entity';
import { SubCategory } from './sub-category.entity';

@Entity({ tableName: 'bill_sub_categories' })
export class BillSubCategory extends BaseEntity {
  @ManyToOne(() => Bill, { nullable: false })
  bill!: Bill;

  @ManyToOne(() => SubCategory, { nullable: false })
  sub_category!: SubCategory;

  @Property({ type: 'integer', nullable: false, default: 1 })
  product_count!: number;

  @Property({ type: 'decimal', precision: 19, scale: 2, nullable: false })
  amount!: number;

  @Property({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  product_weight?: number;
}
