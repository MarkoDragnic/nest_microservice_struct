import { AbstractEntity } from '@app/common/database/postgresql';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'instrument' })
export class Instrument extends AbstractEntity<Instrument> {
  @Column()
  name: string;

  @Column()
  symbol: string;
}
