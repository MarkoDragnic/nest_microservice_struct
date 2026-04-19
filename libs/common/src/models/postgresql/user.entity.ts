import { Column, Entity, Unique } from 'typeorm';
import { AbstractEntity } from '@app/common/database/postgresql';

@Entity('user')
@Unique('UQ_user_email', ['email'])
export class User extends AbstractEntity<User> {
  @Column('text', { name: 'email' })
  email!: string;

  @Column('text', { name: 'password', select: false })
  password!: string;

  @Column('text', { name: 'roles', array: true, nullable: true })
  roles?: string[];

  @Column('boolean', { name: 'notify_by_mail', default: false })
  notifyByEmail!: boolean;

  @Column('timestamp', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt!: Date;

  @Column('timestamp', {
    name: 'updated_at',
    default: () => 'now()',
  })
  updatedAt!: Date;

  @Column('boolean', {
    name: 'is_active',
    default: true,
  })
  isActive!: boolean;
}
