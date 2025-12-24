import { Entity, Property, ManyToOne, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ tableName: 'refresh_tokens' })
export class RefreshToken extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, deleteRule: 'cascade' })
  user!: User;

  @Property({ type: 'varchar', length: 500, nullable: false, unique: true })
  @Index()
  token!: string;

  @Property({ type: 'varchar', length: 255, nullable: true })
  @Index()
  family_id?: string; // For token rotation - groups related tokens

  @Property({ type: 'varchar', length: 45, nullable: true })
  ip_address?: string;

  @Property({ type: 'text', nullable: true })
  user_agent?: string;

  @Property({ type: 'timestamptz', nullable: false, defaultRaw: 'NOW()' })
  created_at!: Date;

  @Property({ type: 'timestamptz', nullable: false })
  expires_at!: Date;

  @Property({ type: 'timestamptz', nullable: true })
  used_at?: Date;

  @Property({ type: 'boolean', nullable: false, default: true })
  is_active!: boolean;

  @Property({ type: 'boolean', nullable: false, default: false })
  is_revoked!: boolean;
}
