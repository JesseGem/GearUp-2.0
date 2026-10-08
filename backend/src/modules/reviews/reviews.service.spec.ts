import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ReviewsService } from './reviews.service.js';

import {
  Review,
} from './entities/review.entity.js';

import {
  Job,
  JobStatus,
} from '../jobs/entities/job.entity.js';

import {
  UserRole,
} from '../users/enums/user-role.enum.js';

describe('ReviewsService', () => {
  let reviewsService: ReviewsService;

  const reviewsRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };

  const jobsRepository = {
    findOne: vi.fn(),
  };

  const createTestJob = (
    overrides: Partial<Job> = {},
  ): Job => {
    return {
      id: 'job-123',
      title: 'Engine diagnostic',
      description:
        'Engine making unusual noise',
      status: JobStatus.COMPLETED,
      estimatedCost: 1200,
      finalCost: 1350,
      userId: 'customer-123',
      vehicleId: 'vehicle-123',
      mechanicId: 'mechanic-123',
      vehicle: undefined,
      mechanic: undefined,
      user: undefined,
      createdAt: new Date(
        '2026-01-01T00:00:00.000Z',
      ),
      updatedAt: new Date(
        '2026-01-01T00:00:00.000Z',
      ),
      ...overrides,
    } as Job;
  };

  const createTestReview = (
    overrides: Partial<Review> = {},
  ): Review => {
    return {
      id: 'review-123',
      rating: 5,
      comment:
        'Great service and quick work.',
      userId: 'customer-123',
      jobId: 'job-123',
      user: undefined,
      job: undefined,
      createdAt: new Date(
        '2026-01-02T00:00:00.000Z',
      ),
      updatedAt: new Date(
        '2026-01-02T00:00:00.000Z',
      ),
      ...overrides,
    } as Review;
  };

  const customerUser = {
    userId: 'customer-123',
    email: 'customer@example.com',
    role: UserRole.CUSTOMER,
  };

  const otherCustomerUser = {
    userId: 'customer-999',
    email: 'other@example.com',
    role: UserRole.CUSTOMER,
  };

  const mechanicUser = {
    userId: 'mechanic-123',
    email: 'mechanic@example.com',
    role: UserRole.MECHANIC,
  };

  const otherMechanicUser = {
    userId: 'mechanic-999',
    email: 'other-mechanic@example.com',
    role: UserRole.MECHANIC,
  };

  const adminUser = {
    userId: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    reviewsService = new ReviewsService(
      reviewsRepository as never,
      jobsRepository as never,
    );
  });

  describe('create', () => {
    it('should create a review for a completed job owned by the customer', async () => {
      const job = createTestJob();

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      reviewsRepository.findOne.mockResolvedValue(
        null,
      );

      const savedReview =
        createTestReview();

      reviewsRepository.save.mockResolvedValue(
        savedReview,
      );

      const result =
        await reviewsService.create(
          customerUser.userId,
          {
            rating: 5,
            comment:
              'Great service and quick work.',
            jobId: job.id,
          },
        );

      expect(
        jobsRepository.findOne,
      ).toHaveBeenCalledWith({
        where: {
          id: job.id,
          userId: customerUser.userId,
        },
      });

      expect(
        reviewsRepository.findOne,
      ).toHaveBeenCalledWith({
        where: {
          userId: customerUser.userId,
          jobId: job.id,
        },
      });

      expect(
        reviewsRepository.save,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 5,
          comment:
            'Great service and quick work.',
          jobId: job.id,
          userId:
            customerUser.userId,
        }),
      );

      expect(result).toBe(
        savedReview,
      );
    });

    it('should reject a job that does not belong to the customer', async () => {
      jobsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        reviewsService.create(
          customerUser.userId,
          {
            rating: 5,
            comment: 'Test review',
            jobId: 'other-job',
          },
        ),
      ).rejects.toThrow(
        'Job not found or does not belong to this user',
      );

      expect(
        reviewsRepository.findOne,
      ).not.toHaveBeenCalled();

      expect(
        reviewsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject a review for a pending job', async () => {
      const job = createTestJob({
        status: JobStatus.PENDING,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        reviewsService.create(
          customerUser.userId,
          {
            rating: 5,
            jobId: job.id,
          },
        ),
      ).rejects.toThrow(
        'Reviews can only be created for completed jobs',
      );

      expect(
        reviewsRepository.findOne,
      ).not.toHaveBeenCalled();

      expect(
        reviewsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject a review for an in-progress job', async () => {
      const job = createTestJob({
        status:
          JobStatus.IN_PROGRESS,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        reviewsService.create(
          customerUser.userId,
          {
            rating: 4,
            jobId: job.id,
          },
        ),
      ).rejects.toThrow(
        'Reviews can only be created for completed jobs',
      );

      expect(
        reviewsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject a review for a cancelled job', async () => {
      const job = createTestJob({
        status:
          JobStatus.CANCELLED,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        reviewsService.create(
          customerUser.userId,
          {
            rating: 1,
            jobId: job.id,
          },
        ),
      ).rejects.toThrow(
        'Reviews can only be created for completed jobs',
      );

      expect(
        reviewsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject a duplicate review for the same job', async () => {
      const job = createTestJob();

      const existingReview =
        createTestReview();

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      reviewsRepository.findOne.mockResolvedValue(
        existingReview,
      );

      await expect(
        reviewsService.create(
          customerUser.userId,
          {
            rating: 5,
            jobId: job.id,
          },
        ),
      ).rejects.toThrow(
        'You have already reviewed this job',
      );

      expect(
        reviewsRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('should return only reviews created by the user', async () => {
      const reviews = [
        createTestReview(),
      ];

      reviewsRepository.find.mockResolvedValue(
        reviews,
      );

      const result =
        await reviewsService.findAllByUser(
          customerUser.userId,
        );

      expect(result).toBe(
        reviews,
      );

      expect(
        reviewsRepository.find,
      ).toHaveBeenCalledWith({
        where: {
          userId:
            customerUser.userId,
        },
        relations: {
          job: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    });
  });

  describe('findByJob', () => {
    it('should allow the customer who owns the job to view its reviews', async () => {
      const job =
        createTestJob({
          userId:
            customerUser.userId,
        });

      const reviews = [
        createTestReview(),
      ];

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      reviewsRepository.find.mockResolvedValue(
        reviews,
      );

      const result =
        await reviewsService.findByJob(
          job.id,
          customerUser,
        );

      expect(result).toBe(
        reviews,
      );

      expect(
        reviewsRepository.find,
      ).toHaveBeenCalledWith({
        where: {
          jobId: job.id,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    });

    it('should allow the assigned mechanic to view the job reviews', async () => {
      const job =
        createTestJob({
          mechanicId:
            mechanicUser.userId,
        });

      const reviews = [
        createTestReview(),
      ];

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      reviewsRepository.find.mockResolvedValue(
        reviews,
      );

      const result =
        await reviewsService.findByJob(
          job.id,
          mechanicUser,
        );

      expect(result).toBe(
        reviews,
      );
    });

    it('should allow an administrator to view any job reviews', async () => {
      const job =
        createTestJob({
          userId: 'customer-999',
          mechanicId: 'mechanic-999',
        });

      const reviews = [
        createTestReview(),
      ];

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      reviewsRepository.find.mockResolvedValue(
        reviews,
      );

      const result =
        await reviewsService.findByJob(
          job.id,
          adminUser,
        );

      expect(result).toBe(
        reviews,
      );
    });

    it('should reject another customer accessing the job reviews', async () => {
      const job = createTestJob({
        userId:
          customerUser.userId,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        reviewsService.findByJob(
          job.id,
          otherCustomerUser,
        ),
      ).rejects.toThrow(
        'Job not found',
      );

      expect(
        reviewsRepository.find,
      ).not.toHaveBeenCalled();
    });

    it('should reject an unrelated mechanic accessing the job reviews', async () => {
      const job = createTestJob({
        mechanicId:
          mechanicUser.userId,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        reviewsService.findByJob(
          job.id,
          otherMechanicUser,
        ),
      ).rejects.toThrow(
        'Job not found',
      );

      expect(
        reviewsRepository.find,
      ).not.toHaveBeenCalled();
    });

    it('should reject access when the job does not exist', async () => {
      jobsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        reviewsService.findByJob(
          'missing-job',
          customerUser,
        ),
      ).rejects.toThrow(
        'Job not found',
      );

      expect(
        reviewsRepository.find,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a review owned by the user', async () => {
      const review =
        createTestReview();

      reviewsRepository.findOne.mockResolvedValue(
        review,
      );

      const result =
        await reviewsService.findOne(
          review.id,
          customerUser.userId,
        );

      expect(result).toBe(
        review,
      );

      expect(
        reviewsRepository.findOne,
      ).toHaveBeenCalledWith({
        where: {
          id: review.id,
          userId:
            customerUser.userId,
        },
        relations: {
          job: true,
        },
      });
    });

    it('should reject another user accessing the review', async () => {
      reviewsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        reviewsService.findOne(
          'review-123',
          otherCustomerUser.userId,
        ),
      ).rejects.toThrow(
        'Review #review-123 not found',
      );
    });
  });

  describe('update', () => {
    it('should update a review owned by the customer', async () => {
      const review =
        createTestReview({
          rating: 3,
          comment: 'Okay service',
        });

      reviewsRepository.findOne.mockResolvedValue(
        review,
      );

      reviewsRepository.save.mockResolvedValue(
        review,
      );

      const result =
        await reviewsService.update(
          review.id,
          customerUser.userId,
          {
            rating: 5,
            comment:
              'Actually, great service.',
          },
        );

      expect(review.rating).toBe(5);
      expect(review.comment).toBe(
        'Actually, great service.',
      );

      expect(
        reviewsRepository.save,
      ).toHaveBeenCalledWith(
        review,
      );

      expect(result).toBe(
        review,
      );
    });

    it('should reject updating a review owned by another user', async () => {
      reviewsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        reviewsService.update(
          'review-123',
          otherCustomerUser.userId,
          {
            rating: 1,
          },
        ),
      ).rejects.toThrow(
        'Review #review-123 not found',
      );

      expect(
        reviewsRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a review owned by the user', async () => {
      reviewsRepository.delete.mockResolvedValue({
        affected: 1,
      });

      await expect(
        reviewsService.remove(
          'review-123',
          customerUser.userId,
        ),
      ).resolves.toBeUndefined();

      expect(
        reviewsRepository.delete,
      ).toHaveBeenCalledWith({
        id: 'review-123',
        userId:
          customerUser.userId,
      });
    });

    it('should reject deleting a review owned by another user', async () => {
      reviewsRepository.delete.mockResolvedValue({
        affected: 0,
      });

      await expect(
        reviewsService.remove(
          'review-123',
          otherCustomerUser.userId,
        ),
      ).rejects.toThrow(
        'Review #review-123 not found',
      );
    });
  });
});