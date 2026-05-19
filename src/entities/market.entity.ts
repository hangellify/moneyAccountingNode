import {
  Entity,
  Property,
  BeforeCreate,
  BeforeUpdate,
  ManyToOne,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ tableName: 'markets' })
export class Market extends BaseEntity {
  @Property({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Property({ type: 'varchar', length: 500, nullable: true })
  address?: string;

  @Property({ type: 'varchar', length: 255, nullable: false })
  city!: string;

  @Property({ type: 'varchar', length: 2, nullable: false })
  country!: string;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

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
