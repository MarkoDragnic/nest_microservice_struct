import { PrimaryColumn } from 'typeorm';

export class AbstractEntity<T> {
  @PrimaryColumn('uuid', {
    name: 'id',
    default: () => 'gen_random_uuid()',
  })
  id?: string;

  constructor(entity?: Partial<T>) {
    if (entity) Object.assign(this, entity);
  }
}
