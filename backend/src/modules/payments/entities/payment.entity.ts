import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import { Job } from '../../jobs/entities/job.entity.js';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount!: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method!: PaymentMethod;

  @Column({
    type: 'text',
    nullable: true,
  })
  reference!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes!: string | null;

  @Column()
  userId!: string;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  jobId!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Job, {
    nullable: true,
  })
  @JoinColumn({ name: 'jobId' })
  job!: Job | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}