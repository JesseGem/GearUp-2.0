import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import { Job } from '../../jobs/entities/job.entity.js';

@Entity('reviews')
@Unique('UQ_reviews_user_job', ['userId', 'jobId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'int',
  })
  rating!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  comment!: string;

  @Column()
  userId!: string;

  @Column()
  jobId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job!: Job;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}