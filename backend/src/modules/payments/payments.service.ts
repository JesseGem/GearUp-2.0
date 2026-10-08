import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Payment,
  PaymentStatus,
} from './entities/payment.entity.js';

import {
  Job,
  JobStatus,
} from '../jobs/entities/job.entity.js';

import { CreatePaymentDto } from './dto/create-payment.dto.js';

import { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,

    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
  ) {}

  async create(
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<Payment> {
    let job: Job | null = null;

    if (createPaymentDto.jobId) {
      job = await this.jobsRepository.findOne({
        where: {
          id: createPaymentDto.jobId,
          userId,
        },
      });

      if (!job) {
        throw new NotFoundException(
          'Job not found or does not belong to this user',
        );
      }

      if (job.status === JobStatus.CANCELLED) {
        throw new BadRequestException(
          'A payment cannot be created for a cancelled job',
        );
      }

      const existingSuccessfulPayment =
        await this.paymentsRepository.findOne({
          where: {
            jobId: job.id,
            status: PaymentStatus.SUCCESS,
          },
        });

      if (existingSuccessfulPayment) {
        throw new ConflictException(
          'This job has already been successfully paid',
        );
      }
    }

    const payment = new Payment();

    payment.amount = createPaymentDto.amount;
    payment.method = createPaymentDto.method;
    payment.status = PaymentStatus.PENDING;

    payment.reference =
      createPaymentDto.reference ?? null;

    payment.notes =
      createPaymentDto.notes ?? null;

    payment.userId = userId;
    payment.jobId = job?.id ?? null;

    return this.paymentsRepository.save(payment);
  }

  async findAll(
    user: AuthenticatedUser,
  ): Promise<Payment[]> {
    if (user.role === UserRole.ADMIN) {
      return this.paymentsRepository.find({
        relations: {
          job: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    }

    return this.paymentsRepository.find({
      where: {
        userId: user.userId,
      },
      relations: {
        job: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Payment> {
    const payment =
      await this.paymentsRepository.findOne({
        where: {
          id,
        },
        relations: {
          job: true,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        `Payment #${id} not found`,
      );
    }

    if (
      user.role !== UserRole.ADMIN &&
      payment.userId !== user.userId
    ) {
      throw new NotFoundException(
        `Payment #${id} not found`,
      );
    }

    return payment;
  }

  async markSuccess(
    id: string,
  ): Promise<Payment> {
    const payment =
      await this.paymentsRepository.findOne({
        where: {
          id,
        },
        relations: {
          job: true,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        `Payment #${id} not found`,
      );
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `A ${payment.status} payment cannot be marked as successful`,
      );
    }

    if (
      payment.job &&
      payment.job.status === JobStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'A payment for a cancelled job cannot be marked as successful',
      );
    }

    payment.status = PaymentStatus.SUCCESS;

    return this.paymentsRepository.save(payment);
  }

  async markFailed(
    id: string,
  ): Promise<Payment> {
    const payment =
      await this.paymentsRepository.findOne({
        where: {
          id,
        },
        relations: {
          job: true,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        `Payment #${id} not found`,
      );
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `A ${payment.status} payment cannot be marked as failed`,
      );
    }

    payment.status = PaymentStatus.FAILED;

    return this.paymentsRepository.save(payment);
  }

  async refund(
    id: string,
  ): Promise<Payment> {
    const payment =
      await this.paymentsRepository.findOne({
        where: {
          id,
        },
        relations: {
          job: true,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        `Payment #${id} not found`,
      );
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(
        'Only successful payments can be refunded',
      );
    }

    payment.status = PaymentStatus.REFUNDED;

    return this.paymentsRepository.save(payment);
  }
}