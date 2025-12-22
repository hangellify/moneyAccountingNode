import { Entity, PrimaryKey } from '@mikro-orm/core';

/**
 * Base placeholder entity required for MikroORM initialization.
 * This entity can be removed or replaced when you add your actual entities.
 * Uses UUID as primary key type.
 */
@Entity({ tableName: '_placeholder' })
export class BaseEntity {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;
}
