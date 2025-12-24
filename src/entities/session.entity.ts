import { Entity, Property, ManyToOne, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ tableName: 'sessions' })
export class Session extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, deleteRule: 'cascade' })
  user!: User;

  @Property({ type: 'varchar', length: 255, nullable: false, unique: true })
  @Index()
  session_token!: string;

  @Property({ type: 'varchar', length: 45, nullable: true })
  ip_address?: string;

  @Property({ type: 'text', nullable: true })
  user_agent?: string;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  created_at!: Date;

  @Property({ type: 'timestamptz', nullable: false })
  expires_at!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  last_activity_at?: Date;

  @Property({ type: 'boolean', nullable: false, default: true })
  is_active!: boolean;
}
