import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  IsNull,
  Repository,
} from 'typeorm';

import {
  Job,
  JobStatus,
} from './entities/job.entity.js';

import { Vehicle } from '../vehicles/entities/vehicle.entity.js';

import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { CompleteJobDto } from './dto/complete-job.dto.js';

import { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,

    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(
    userId: string,
    createJobDto: CreateJobDto,
  ): Promise<Job> {
    const vehicle =
      await this.vehiclesRepository.findOne({
        where: {
          id: createJobDto.vehicleId,
          userId,
        },
      });

    if (!vehicle) {
      throw new NotFoundException(
        'Vehicle not found or does not belong to this user',
      );
    }

    const job = new Job();

    job.title = createJobDto.title;
    job.description =
      createJobDto.description ?? '';
    job.vehicleId = vehicle.id;
    job.userId = userId;
    job.status = JobStatus.PENDING;
    job.estimatedCost =
      createJobDto.estimatedCost ?? 0;
    job.finalCost = 0;
    job.mechanicId = null;

    return this.jobsRepository.save(job);
  }

  async findAll(
    user: AuthenticatedUser,
  ): Promise<Job[]> {
    if (user.role === UserRole.ADMIN) {
      return this.jobsRepository.find({
        relations: {
          vehicle: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    }

    if (user.role === UserRole.MECHANIC) {
      return this.jobsRepository.find({
        where: {
          mechanicId: user.userId,
        },
        relations: {
          vehicle: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    }

    return this.jobsRepository.find({
      where: {
        userId: user.userId,
      },
      relations: {
        vehicle: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findAvailableForMechanics(): Promise<Job[]> {
    return this.jobsRepository.find({
      where: {
        status: JobStatus.PENDING,
        mechanicId: IsNull(),
      },
      relations: {
        vehicle: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Job> {
    const job =
      await this.jobsRepository.findOne({
        where: {
          id,
        },
        relations: {
          vehicle: true,
        },
      });

    if (!job) {
      throw new NotFoundException(
        'Job not found',
      );
    }

    if (user.role === UserRole.ADMIN) {
      return job;
    }

    if (
      user.role === UserRole.CUSTOMER &&
      job.userId === user.userId
    ) {
      return job;
    }

    if (
      user.role === UserRole.MECHANIC &&
      job.mechanicId === user.userId
    ) {
      return job;
    }

    throw new NotFoundException(
      'Job not found',
    );
  }

  async update(
    id: string,
    userId: string,
    updateJobDto: UpdateJobDto,
  ): Promise<Job> {
    const job =
      await this.jobsRepository.findOne({
        where: {
          id,
          userId,
        },
      });

    if (!job) {
      throw new NotFoundException(
        'Job not found',
      );
    }

    if (job.status !== JobStatus.PENDING) {
      throw new ForbiddenException(
        'Only pending jobs can be edited',
      );
    }

    if (
      updateJobDto.title !== undefined
    ) {
      job.title =
        updateJobDto.title;
    }

    if (
      updateJobDto.description !== undefined
    ) {
      job.description =
        updateJobDto.description;
    }

    if (
      updateJobDto.estimatedCost !== undefined
    ) {
      job.estimatedCost =
        updateJobDto.estimatedCost;
    }

    return this.jobsRepository.save(job);
  }

  async accept(
    id: string,
    mechanicId: string,
  ): Promise<Job> {
    const result =
      await this.jobsRepository.update(
        {
          id,
          status: JobStatus.PENDING,
          mechanicId: IsNull(),
        },
        {
          mechanicId,
          status: JobStatus.IN_PROGRESS,
        },
      );

    if (result.affected !== 1) {
      throw new NotFoundException(
        'Job is not available for acceptance',
      );
    }

    const job =
      await this.jobsRepository.findOne({
        where: {
          id,
        },
        relations: {
          vehicle: true,
        },
      });

    if (!job) {
      throw new NotFoundException(
        'Job not found after acceptance',
      );
    }

    return job;
  }

  async complete(
    id: string,
    mechanicId: string,
    completeJobDto: CompleteJobDto,
  ): Promise<Job> {
    const job =
      await this.jobsRepository.findOne({
        where: {
          id,
          mechanicId,
          status: JobStatus.IN_PROGRESS,
        },
      });

    if (!job) {
      throw new NotFoundException(
        'In-progress job not found for this mechanic',
      );
    }

    job.finalCost =
      completeJobDto.finalCost;

    job.status =
      JobStatus.COMPLETED;

    return this.jobsRepository.save(job);
  }

  async cancel(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Job> {
    const job =
      await this.jobsRepository.findOne({
        where: {
          id,
        },
      });

    if (!job) {
      throw new NotFoundException(
        'Job not found',
      );
    }

    if (user.role === UserRole.ADMIN) {
      if (
        job.status === JobStatus.COMPLETED ||
        job.status === JobStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'This job cannot be cancelled',
        );
      }

      job.status =
        JobStatus.CANCELLED;

      return this.jobsRepository.save(job);
    }

    if (user.role === UserRole.CUSTOMER) {
      if (job.userId !== user.userId) {
        throw new NotFoundException(
          'Job not found',
        );
      }

      if (
        job.status !== JobStatus.PENDING
      ) {
        throw new ForbiddenException(
          'Only pending jobs can be cancelled by the customer',
        );
      }

      job.status =
        JobStatus.CANCELLED;

      return this.jobsRepository.save(job);
    }

    if (user.role === UserRole.MECHANIC) {
      if (
        job.mechanicId !== user.userId
      ) {
        throw new NotFoundException(
          'Job not found',
        );
      }

      if (
        job.status !== JobStatus.IN_PROGRESS
      ) {
        throw new ForbiddenException(
          'Only in-progress jobs can be cancelled by the mechanic',
        );
      }

      job.status =
        JobStatus.CANCELLED;

      return this.jobsRepository.save(job);
    }

    throw new ForbiddenException(
      'You are not allowed to cancel this job',
    );
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ message: string }> {
    const job =
      await this.jobsRepository.findOne({
        where: {
          id,
          userId,
        },
      });

    if (!job) {
      throw new NotFoundException(
        'Job not found',
      );
    }

    if (
      job.status !== JobStatus.PENDING
    ) {
      throw new ForbiddenException(
        'Only pending jobs can be deleted',
      );
    }

    await this.jobsRepository.remove(job);

    return {
      message:
        'Job deleted successfully',
    };
  }
}