import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Job } from '../../jobs/entities/job.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  rating!: number; // 1 to 5

  @Column({ type: 'text', nullable: true })
  comment!: string;

  @Column()
  userId!: string; // who wrote the review

  @Column()
  jobId!: string; // which job is being reviewed

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