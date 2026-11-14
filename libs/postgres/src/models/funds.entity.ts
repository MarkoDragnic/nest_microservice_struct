import { AbstractEntity } from '../abstract.entity';
import { numericTransformer } from '../numeric.transformer';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'funds' })
export class Funds extends AbstractEntity<Funds> {
  @Column('numeric', { transformer: numericTransformer })
  initial: number;

  @Column('numeric', { transformer: numericTransformer })
  value: number;

  @Column('numeric', { default: 0, transformer: numericTransformer })
  reserved: number;

  @Column('text')
  base: string;

  @Column('boolean', { default: false })
  dynamic: boolean;

  @Column('text')
  partial: string;

  @Column('numeric', { transformer: numericTransformer })
  size: number;
}
