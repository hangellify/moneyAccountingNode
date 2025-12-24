import { Entity, Property, BeforeCreate, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { PlaningHorizon } from './planing-horizon.entity';

@Entity({ tableName: 'budgets' })
export class Budget extends BaseEntity {
  @Property({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  created_at!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  deleted_at?: Date;

  @OneToMany(() => PlaningHorizon, (planingHorizon) => planingHorizon.budget)
  planingHorizons = new Collection<PlaningHorizon>(this);

  @BeforeCreate()
  beforeCreate() {
    this.created_at = new Date();
  }
}

