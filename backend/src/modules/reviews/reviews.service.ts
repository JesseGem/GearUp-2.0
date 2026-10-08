import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Review,
} from './entities/review.entity.js';

import {
  Job,
  JobStatus,
} from '../jobs/entities/job.entity.js';

import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

import { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,

    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
  ) {}

  async create(
    userId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<Review> {
    const job =
      await this.jobsRepository.findOne({
        where: {
          id: createReviewDto.jobId,
          userId,
        },
      });

    if (!job) {
      throw new NotFoundException(
        'Job not found or does not belong to this user',
      );
    }

    if (job.status !== JobStatus.COMPLETED) {
      throw new ForbiddenException(
        'Reviews can only be created for completed jobs',
      );
    }

    const existingReview =
      await this.reviewsRepository.findOne({
        where: {
          userId,
          jobId: job.id,
        },
      });

    if (existingReview) {
      throw new ConflictException(
        'You have already reviewed this job',
      );
    }

    const review = new Review();

    review.rating =
      createReviewDto.rating;

    review.comment =
      createReviewDto.comment ?? '';

    review.jobId = job.id;
    review.userId = userId;

    return this.reviewsRepository.save(
      review,
    );
  }

  async findAllByUser(
    userId: string,
  ): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: {
        userId,
      },
      relations: {
        job: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findByJob(
    jobId: string,
    user: AuthenticatedUser,
  ): Promise<Review[]> {
    const job =
      await this.jobsRepository.findOne({
        where: {
          id: jobId,
        },
      });

    if (!job) {
      throw new NotFoundException(
        'Job not found',
      );
    }

    const hasAccess =
      user.role === UserRole.ADMIN ||
      (user.role === UserRole.CUSTOMER &&
        job.userId === user.userId) ||
      (user.role === UserRole.MECHANIC &&
        job.mechanicId === user.userId);

    if (!hasAccess) {
      throw new NotFoundException(
        'Job not found',
      );
    }

    return this.reviewsRepository.find({
      where: {
        jobId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<Review> {
    const review =
      await this.reviewsRepository.findOne({
        where: {
          id,
          userId,
        },
        relations: {
          job: true,
        },
      });

    if (!review) {
      throw new NotFoundException(
        `Review #${id} not found`,
      );
    }

    return review;
  }

  async update(
    id: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    const review =
      await this.findOne(id, userId);

    if (updateReviewDto.rating !== undefined) {
      review.rating =
        updateReviewDto.rating;
    }

    if (
      updateReviewDto.comment !== undefined
    ) {
      review.comment =
        updateReviewDto.comment ?? '';
    }

    return this.reviewsRepository.save(
      review,
    );
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<void> {
    const result =
      await this.reviewsRepository.delete({
        id,
        userId,
      });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Review #${id} not found`,
      );
    }
  }
}