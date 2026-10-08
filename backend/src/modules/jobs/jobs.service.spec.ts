import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { JobsService } from './jobs.service.js';

import {
  Job,
  JobStatus,
} from './entities/job.entity.js';

import { UserRole } from '../users/enums/user-role.enum.js';

describe('JobsService', () => {
  let jobsService: JobsService;

  const jobsRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const vehiclesRepository = {
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
      status: JobStatus.PENDING,
      estimatedCost: 1200,
      finalCost: 0,
      userId: 'customer-123',
      vehicleId: 'vehicle-123',
      mechanicId: null,
      vehicle: undefined,
      mechanic: null,
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

  const customerUser = {
    userId: 'customer-123',
    email: 'customer@example.com',
    role: UserRole.CUSTOMER,
  };

  const mechanicUser = {
    userId: 'mechanic-123',
    email: 'mechanic@example.com',
    role: UserRole.MECHANIC,
  };

  const adminUser = {
    userId: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    jobsService = new JobsService(
      jobsRepository as never,
      vehiclesRepository as never,
    );
  });

  describe('create', () => {
    it('should create a pending job for a vehicle owned by the customer', async () => {
      const vehicle = {
        id: 'vehicle-123',
        userId: 'customer-123',
      };

      const savedJob = createTestJob();

      vehiclesRepository.findOne.mockResolvedValue(
        vehicle,
      );

      jobsRepository.save.mockResolvedValue(
        savedJob,
      );

      const result =
        await jobsService.create(
          'customer-123',
          {
            title: 'Engine diagnostic',
            description:
              'Engine making unusual noise',
            vehicleId: 'vehicle-123',
            estimatedCost: 1200,
          },
        );

      expect(
        vehiclesRepository.findOne,
      ).toHaveBeenCalledWith({
        where: {
          id: 'vehicle-123',
          userId: 'customer-123',
        },
      });

      expect(
        jobsRepository.save,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Engine diagnostic',
          description:
            'Engine making unusual noise',
          vehicleId: 'vehicle-123',
          userId: 'customer-123',
          status: JobStatus.PENDING,
          estimatedCost: 1200,
          finalCost: 0,
          mechanicId: null,
        }),
      );

      expect(result).toBe(savedJob);
    });

    it('should reject a vehicle that does not belong to the customer', async () => {
      vehiclesRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        jobsService.create(
          'customer-123',
          {
            title: 'Engine diagnostic',
            vehicleId: 'vehicle-999',
          },
        ),
      ).rejects.toThrow(
        'Vehicle not found or does not belong to this user',
      );

      expect(
        jobsRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return only the customer\'s jobs', async () => {
      const jobs = [
        createTestJob(),
      ];

      jobsRepository.find.mockResolvedValue(
        jobs,
      );

      const result =
        await jobsService.findAll(
          customerUser,
        );

      expect(result).toBe(jobs);

      expect(
        jobsRepository.find,
      ).toHaveBeenCalledWith({
        where: {
          userId: 'customer-123',
        },
        relations: {
          vehicle: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    });

    it('should return only jobs assigned to a mechanic', async () => {
      const jobs = [
        createTestJob({
          mechanicId: 'mechanic-123',
          status: JobStatus.IN_PROGRESS,
        }),
      ];

      jobsRepository.find.mockResolvedValue(
        jobs,
      );

      const result =
        await jobsService.findAll(
          mechanicUser,
        );

      expect(result).toBe(jobs);

      expect(
        jobsRepository.find,
      ).toHaveBeenCalledWith({
        where: {
          mechanicId: 'mechanic-123',
        },
        relations: {
          vehicle: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    });

    it('should return all jobs for an administrator', async () => {
      const jobs = [
        createTestJob(),
      ];

      jobsRepository.find.mockResolvedValue(
        jobs,
      );

      const result =
        await jobsService.findAll(
          adminUser,
        );

      expect(result).toBe(jobs);

      expect(
        jobsRepository.find,
      ).toHaveBeenCalledWith({
        relations: {
          vehicle: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    });
  });

  describe('findAvailableForMechanics', () => {
    it('should return only pending unassigned jobs', async () => {
      const jobs = [
        createTestJob(),
      ];

      jobsRepository.find.mockResolvedValue(
        jobs,
      );

      const result =
        await jobsService.findAvailableForMechanics();

      expect(result).toBe(jobs);

      expect(
        jobsRepository.find,
      ).toHaveBeenCalledWith({
        where: {
          status: JobStatus.PENDING,
          mechanicId: expect.anything(),
        },
        relations: {
          vehicle: true,
        },
        order: {
          createdAt: 'ASC',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should allow a customer to access their own job', async () => {
      const job = createTestJob({
        userId: 'customer-123',
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.findOne(
          job.id,
          customerUser,
        );

      expect(result).toBe(job);
    });

    it('should reject a customer accessing another customer\'s job', async () => {
      const job = createTestJob({
        userId: 'different-customer',
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        jobsService.findOne(
          job.id,
          customerUser,
        ),
      ).rejects.toThrow(
        'Job not found',
      );
    });

    it('should allow the assigned mechanic to access the job', async () => {
      const job = createTestJob({
        mechanicId: 'mechanic-123',
        status: JobStatus.IN_PROGRESS,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.findOne(
          job.id,
          mechanicUser,
        );

      expect(result).toBe(job);
    });

    it('should reject an unassigned mechanic accessing the job', async () => {
      const job = createTestJob({
        mechanicId: 'different-mechanic',
        status: JobStatus.IN_PROGRESS,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        jobsService.findOne(
          job.id,
          mechanicUser,
        ),
      ).rejects.toThrow(
        'Job not found',
      );
    });

    it('should allow an administrator to access any job', async () => {
      const job = createTestJob({
        userId: 'customer-999',
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.findOne(
          job.id,
          adminUser,
        );

      expect(result).toBe(job);
    });

    it('should reject when the job does not exist', async () => {
      jobsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        jobsService.findOne(
          'missing-job',
          customerUser,
        ),
      ).rejects.toThrow(
        'Job not found',
      );
    });
  });

  describe('update', () => {
    it('should update a customer\'s pending job', async () => {
      const job = createTestJob();

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      jobsRepository.save.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.update(
          job.id,
          'customer-123',
          {
            title: 'Brake inspection',
            description:
              'Inspect front brakes',
            estimatedCost: 850,
          },
        );

      expect(job.title).toBe(
        'Brake inspection',
      );

      expect(job.description).toBe(
        'Inspect front brakes',
      );

      expect(job.estimatedCost).toBe(
        850,
      );

      expect(
        jobsRepository.save,
      ).toHaveBeenCalledWith(job);

      expect(result).toBe(job);
    });

    it('should reject updating a non-pending job', async () => {
      const job = createTestJob({
        status: JobStatus.IN_PROGRESS,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        jobsService.update(
          job.id,
          'customer-123',
          {
            title: 'Updated title',
          },
        ),
      ).rejects.toThrow(
        'Only pending jobs can be edited',
      );

      expect(
        jobsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject updating another customer\'s job', async () => {
      jobsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        jobsService.update(
          'job-123',
          'different-customer',
          {
            title: 'Updated title',
          },
        ),
      ).rejects.toThrow(
        'Job not found',
      );
    });
  });

  describe('accept', () => {
    it('should atomically assign a pending unassigned job to a mechanic', async () => {
      const job =
        createTestJob({
          status:
            JobStatus.IN_PROGRESS,
          mechanicId:
            'mechanic-123',
        });

      jobsRepository.update.mockResolvedValue({
        affected: 1,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.accept(
          'job-123',
          'mechanic-123',
        );

      expect(
        jobsRepository.update,
      ).toHaveBeenCalledWith(
        {
          id: 'job-123',
          status: JobStatus.PENDING,
          mechanicId: expect.anything(),
        },
        {
          mechanicId: 'mechanic-123',
          status: JobStatus.IN_PROGRESS,
        },
      );

      expect(result).toBe(job);
    });

    it('should reject a job that has already been accepted', async () => {
      jobsRepository.update.mockResolvedValue({
        affected: 0,
      });

      await expect(
        jobsService.accept(
          'job-123',
          'mechanic-123',
        ),
      ).rejects.toThrow(
        'Job is not available for acceptance',
      );

      expect(
        jobsRepository.findOne,
      ).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('should complete an in-progress job assigned to the mechanic', async () => {
      const job = createTestJob({
        status: JobStatus.IN_PROGRESS,
        mechanicId: 'mechanic-123',
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      jobsRepository.save.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.complete(
          job.id,
          'mechanic-123',
          {
            finalCost: 1350,
          },
        );

      expect(job.finalCost).toBe(
        1350,
      );

      expect(job.status).toBe(
        JobStatus.COMPLETED,
      );

      expect(
        jobsRepository.save,
      ).toHaveBeenCalledWith(job);

      expect(result).toBe(job);
    });

    it('should reject completion by a different mechanic', async () => {
      jobsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        jobsService.complete(
          'job-123',
          'different-mechanic',
          {
            finalCost: 1350,
          },
        ),
      ).rejects.toThrow(
        'In-progress job not found for this mechanic',
      );

      expect(
        jobsRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should allow a customer to cancel their pending job', async () => {
      const job = createTestJob();

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      jobsRepository.save.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.cancel(
          job.id,
          customerUser,
        );

      expect(job.status).toBe(
        JobStatus.CANCELLED,
      );

      expect(
        jobsRepository.save,
      ).toHaveBeenCalledWith(job);

      expect(result).toBe(job);
    });

    it('should reject a customer cancelling another customer\'s job', async () => {
      const job = createTestJob({
        userId: 'different-customer',
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        jobsService.cancel(
          job.id,
          customerUser,
        ),
      ).rejects.toThrow(
        'Job not found',
      );

      expect(
        jobsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject a customer cancelling an in-progress job', async () => {
      const job = createTestJob({
        status: JobStatus.IN_PROGRESS,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        jobsService.cancel(
          job.id,
          customerUser,
        ),
      ).rejects.toThrow(
        'Only pending jobs can be cancelled by the customer',
      );
    });

    it('should allow the assigned mechanic to cancel an in-progress job', async () => {
      const job = createTestJob({
        status: JobStatus.IN_PROGRESS,
        mechanicId: 'mechanic-123',
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      jobsRepository.save.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.cancel(
          job.id,
          mechanicUser,
        );

      expect(job.status).toBe(
        JobStatus.CANCELLED,
      );

      expect(result).toBe(job);
    });

    it('should reject a different mechanic cancelling the job', async () => {
      const job = createTestJob({
        status: JobStatus.IN_PROGRESS,
        mechanicId: 'different-mechanic',
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        jobsService.cancel(
          job.id,
          mechanicUser,
        ),
      ).rejects.toThrow(
        'Job not found',
      );

      expect(
        jobsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should allow an administrator to cancel an active job', async () => {
      const job = createTestJob({
        status: JobStatus.IN_PROGRESS,
        mechanicId: 'mechanic-123',
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      jobsRepository.save.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.cancel(
          job.id,
          adminUser,
        );

      expect(job.status).toBe(
        JobStatus.CANCELLED,
      );

      expect(result).toBe(job);
    });

    it('should reject an administrator cancelling a completed job', async () => {
      const job = createTestJob({
        status: JobStatus.COMPLETED,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        jobsService.cancel(
          job.id,
          adminUser,
        ),
      ).rejects.toThrow(
        'This job cannot be cancelled',
      );
    });

    it('should reject an administrator cancelling an already cancelled job', async () => {
      const job = createTestJob({
        status: JobStatus.CANCELLED,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        jobsService.cancel(
          job.id,
          adminUser,
        ),
      ).rejects.toThrow(
        'This job cannot be cancelled',
      );
    });

    it('should reject cancellation when the job does not exist', async () => {
      jobsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        jobsService.cancel(
          'missing-job',
          customerUser,
        ),
      ).rejects.toThrow(
        'Job not found',
      );
    });
  });

  describe('remove', () => {
    it('should delete a customer\'s pending job', async () => {
      const job = createTestJob();

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      jobsRepository.remove.mockResolvedValue(
        job,
      );

      const result =
        await jobsService.remove(
          job.id,
          'customer-123',
        );

      expect(
        jobsRepository.remove,
      ).toHaveBeenCalledWith(job);

      expect(result).toEqual({
        message:
          'Job deleted successfully',
      });
    });

    it('should reject deleting a non-pending job', async () => {
      const job = createTestJob({
        status: JobStatus.IN_PROGRESS,
      });

      jobsRepository.findOne.mockResolvedValue(
        job,
      );

      await expect(
        jobsService.remove(
          job.id,
          'customer-123',
        ),
      ).rejects.toThrow(
        'Only pending jobs can be deleted',
      );

      expect(
        jobsRepository.remove,
      ).not.toHaveBeenCalled();
    });

    it('should reject deleting another customer\'s job', async () => {
      jobsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        jobsService.remove(
          'job-123',
          'different-customer',
        ),
      ).rejects.toThrow(
        'Job not found',
      );

      expect(
        jobsRepository.remove,
      ).not.toHaveBeenCalled();
    });
  });
});