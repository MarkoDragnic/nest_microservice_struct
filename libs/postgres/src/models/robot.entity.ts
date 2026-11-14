import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, Unique, UpdateDateColumn } from 'typeorm';
import { AbstractEntity } from '../abstract.entity';
import { RobotTypes } from '@app/contracts/types';
import type { IIndicatorsConfig } from '@app/contracts/interfaces';
import { User, Account, Funds, Instrument } from './index';

@Entity('robot')
@Unique('UQ_robot_hash', ['hash'])
export class Robot extends AbstractEntity<Robot> {
  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column('text', { name: 'full_symbol' })
  fsymbol: string;

  @Column('text')
  name: string;

  @Column({ type: 'enum', enum: RobotTypes })
  type: RobotTypes;

  @Column('text')
  assets: string;

  @Column({ nullable: true })
  active: boolean;

  @ManyToOne(() => Account, { eager: true })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column('text')
  hash: string;

  @ManyToOne(() => Funds, { cascade: true, eager: true })
  @JoinColumn({ name: 'funds_id' })
  funds: Funds;

  @ManyToOne(() => Instrument, { cascade: true, eager: true })
  @JoinColumn({ name: 'instrument_id' })
  instrument: Instrument;

  @Column('jsonb', { name: 'indicators', nullable: true })
  indicators?: IIndicatorsConfig;

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;
}
