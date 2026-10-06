import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../abstract.entity';
import { numericTransformer } from '../numeric.transformer';
import { PositionCloseReason, PositionStatus, RobotTypes } from '@app/contracts/types';
import type { IIndicatorsConfig } from '@app/contracts/interfaces';
import { Robot } from './robot.entity';

@Entity({ name: 'position' })
@Index('IDX_position_robot_status_opened_at', ['robot', 'status', 'openedAt'])
export class Position extends AbstractEntity<Position> {
  @ManyToOne(() => Robot, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'robot_id' })
  robot: Robot;

  @Column('text', { name: 'symbol' })
  symbol: string;

  @Column({ type: 'enum', enum: RobotTypes, name: 'type' })
  type: RobotTypes;

  @Column({ type: 'enum', enum: PositionStatus, name: 'status' })
  status: PositionStatus;

  @Column('numeric', { name: 'entry_price', transformer: numericTransformer })
  entryPrice: number;

  @Column('numeric', { name: 'close_price', transformer: numericTransformer, nullable: true })
  closePrice?: number | null;

  @Column('timestamptz', { name: 'opened_at' })
  openedAt: Date;

  @Column('timestamptz', { name: 'closed_at', nullable: true })
  closedAt?: Date | null;

  @Column({ type: 'enum', enum: PositionCloseReason, name: 'close_reason', nullable: true })
  closeReason?: PositionCloseReason | null;

  @Column('numeric', { name: 'quantity', transformer: numericTransformer })
  quantity: number;

  @Column('numeric', { name: 'open_transaction_value', transformer: numericTransformer, nullable: true })
  openTransactionValue?: number | null;

  @Column('numeric', { name: 'close_transaction_value', transformer: numericTransformer, nullable: true })
  closeTransactionValue?: number | null;

  @Column('numeric', { name: 'transaction', transformer: numericTransformer })
  transaction: number;

  @Column('jsonb', { name: 'rules', nullable: true })
  rules?: IIndicatorsConfig;
}
