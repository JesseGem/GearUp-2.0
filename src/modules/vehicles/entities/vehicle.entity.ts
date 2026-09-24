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

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  make: string; // e.g. Toyota

  @Column()
  model: string; // e.g. Corolla

  @Column()
  year: number;

  @Column({ unique: true })
  plateNumber: string;

  @Column({ nullable: true })
  vin: string;

  @Column({ nullable: true })
  color: string;

  @Column()
  userId: string; // owner of the vehicle

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}