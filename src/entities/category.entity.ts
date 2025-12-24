import {
  Entity,
  Property,
  BeforeCreate,
  BeforeUpdate,
  ManyToMany,
  Collection,
  OneToMany,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { PlaningHorizon } from './planing-horizon.entity';
import { SubCategory } from './sub-category.entity';

@Entity({ tableName: 'categories' })
export class Category extends BaseEntity {
  @Property({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  created_at!: Date;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  updated_at!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  deleted_at?: Date;

  @ManyToMany(
    () => PlaningHorizon,
    (planingHorizon) => planingHorizon.categories,
  )
  planingHorizons = new Collection<PlaningHorizon>(this);

  @OneToMany(() => SubCategory, (subCategory) => subCategory.category)
  subCategories = new Collection<SubCategory>(this);

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
