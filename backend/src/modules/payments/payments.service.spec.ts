import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentsService } from './payments.service.js';
import { PaymentStatus } from './enums/payment-status.enum.js';
import { PaymentMethod } from './enums/payment-method.enum.js';
import { JobStatus } from '../jobs/enums/job-status.enum.js';
import { UserRole } from '../users/enums/user-role.enum.js';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const paymentsRepository = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const jobsRepository = {
    findOne: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new PaymentsService(
      paymentsRepository as any,
      jobsRepository as any,
    );
  });

  describe('create', () => {
    it('should create a payment successfully without a job', async () => {
      const dto = {
        amount: 850,
        method: PaymentMethod.CASH,
      };

      const createdPayment = {
        id: 'payment-1',
        amount: 850,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
        userId: 'user-1',
        jobId: null,
      };

      paymentsRepository.save.mockResolvedValue(
        createdPayment,
      );

      const result = await service.create(
        'user-1',
        dto as any,
      );

      expect(
        paymentsRepository.save,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 850,
          method: PaymentMethod.CASH,
          status: PaymentStatus.PENDING,
          userId: 'user-1',
          jobId: null,
        }),
      );

      expect(result).toEqual(createdPayment);
    });

    it('should create a payment for a valid customer-owned job', async () => {
      const job = {
        id: 'job-1',
        userId: 'user-1',
        status: JobStatus.COMPLETED,
      };

      const dto = {
        amount: 850,
        method: PaymentMethod.MOBILE_MONEY,
        jobId: 'job-1',
      };

      const createdPayment = {
        id: 'payment-1',
        amount: 850,
        method: PaymentMethod.MOBILE_MONEY,
        status: PaymentStatus.PENDING,
        userId: 'user-1',
        jobId: 'job-1',
      };

      jobsRepository.findOne.mockResolvedValue(job);
      paymentsRepository.findOne.mockResolvedValue(null);
      paymentsRepository.save.mockResolvedValue(
        createdPayment,
      );

      const result = await service.create(
        'user-1',
        dto as any,
      );

      expect(
        jobsRepository.findOne,
      ).toHaveBeenCalled();

      expect(
        paymentsRepository.findOne,
      ).toHaveBeenCalled();

      expect(
        paymentsRepository.save,
      ).toHaveBeenCalled();

      expect(result).toEqual(createdPayment);
    });

    it('should reject a payment when the job does not belong to the user', async () => {
      jobsRepository.findOne.mockResolvedValue(null);

      const dto = {
        amount: 850,
        method: PaymentMethod.CASH,
        jobId: 'job-1',
      };

      await expect(
        service.create('user-1', dto as any),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject a payment for a cancelled job', async () => {
      jobsRepository.findOne.mockResolvedValue({
        id: 'job-1',
        userId: 'user-1',
        status: JobStatus.CANCELLED,
      });

      const dto = {
        amount: 850,
        method: PaymentMethod.CASH,
        jobId: 'job-1',
      };

      await expect(
        service.create('user-1', dto as any),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject a payment when the job already has a successful payment', async () => {
      jobsRepository.findOne.mockResolvedValue({
        id: 'job-1',
        userId: 'user-1',
        status: JobStatus.COMPLETED,
      });

      paymentsRepository.findOne.mockResolvedValue({
        id: 'existing-payment',
        jobId: 'job-1',
        status: PaymentStatus.SUCCESS,
      });

      const dto = {
        amount: 850,
        method: PaymentMethod.CARD,
        jobId: 'job-1',
      };

      await expect(
        service.create('user-1', dto as any),
      ).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all payments for an admin', async () => {
      const payments = [
        {
          id: 'payment-1',
          userId: 'user-1',
        },
        {
          id: 'payment-2',
          userId: 'user-2',
        },
      ];

      paymentsRepository.find.mockResolvedValue(
        payments,
      );

      const result = await service.findAll({
        userId: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      expect(
        paymentsRepository.find,
      ).toHaveBeenCalled();

      expect(result).toEqual(payments);
    });

    it('should return only the authenticated user payments', async () => {
      const payments = [
        {
          id: 'payment-1',
          userId: 'user-1',
        },
      ];

      paymentsRepository.find.mockResolvedValue(
        payments,
      );

      const result = await service.findAll({
        userId: 'user-1',
        email: 'user@example.com',
        role: UserRole.CUSTOMER,
      });

      expect(
        paymentsRepository.find,
      ).toHaveBeenCalled();

      expect(result).toEqual(payments);
    });
  });

  describe('findOne', () => {
    it('should return any payment when requested by an admin', async () => {
      const payment = {
        id: 'payment-1',
        userId: 'user-2',
        amount: 850,
      };

      paymentsRepository.findOne.mockResolvedValue(
        payment,
      );

      const result = await service.findOne(
        'payment-1',
        {
          userId: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      );

      expect(result).toEqual(payment);
    });

    it('should return the user payment when requested by its owner', async () => {
      const payment = {
        id: 'payment-1',
        userId: 'user-1',
        amount: 850,
      };

      paymentsRepository.findOne.mockResolvedValue(
        payment,
      );

      const result = await service.findOne(
        'payment-1',
        {
          userId: 'user-1',
          email: 'user@example.com',
          role: UserRole.CUSTOMER,
        },
      );

      expect(result).toEqual(payment);
    });

    it('should reject access to another user payment', async () => {
      paymentsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.findOne('payment-1', {
          userId: 'user-1',
          email: 'user@example.com',
          role: UserRole.CUSTOMER,
        }),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('markSuccess', () => {
    it('should mark a pending payment as successful', async () => {
      const payment = {
        id: 'payment-1',
        status: PaymentStatus.PENDING,
        jobId: null,
        job: null,
      };

      const savedPayment = {
        ...payment,
        status: PaymentStatus.SUCCESS,
      };

      paymentsRepository.findOne.mockResolvedValue(
        payment,
      );

      paymentsRepository.save.mockResolvedValue(
        savedPayment,
      );

      const result = await service.markSuccess(
        'payment-1',
      );

      expect(payment.status).toBe(
        PaymentStatus.SUCCESS,
      );

      expect(
        paymentsRepository.save,
      ).toHaveBeenCalledWith(payment);

      expect(result).toEqual(savedPayment);
    });

    it('should reject success when the payment does not exist', async () => {
      paymentsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.markSuccess('payment-1'),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject success when the payment job is cancelled', async () => {
      paymentsRepository.findOne.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.PENDING,
        jobId: 'job-1',
        job: {
          id: 'job-1',
          status: JobStatus.CANCELLED,
        },
      });

      await expect(
        service.markSuccess('payment-1'),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should not change an already successful payment', async () => {
      paymentsRepository.findOne.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.SUCCESS,
        jobId: null,
        job: null,
      });

      await expect(
        service.markSuccess('payment-1'),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('markFailed', () => {
    it('should mark a pending payment as failed', async () => {
      const payment = {
        id: 'payment-1',
        status: PaymentStatus.PENDING,
      };

      const savedPayment = {
        ...payment,
        status: PaymentStatus.FAILED,
      };

      paymentsRepository.findOne.mockResolvedValue(
        payment,
      );

      paymentsRepository.save.mockResolvedValue(
        savedPayment,
      );

      const result = await service.markFailed(
        'payment-1',
      );

      expect(payment.status).toBe(
        PaymentStatus.FAILED,
      );

      expect(
        paymentsRepository.save,
      ).toHaveBeenCalledWith(payment);

      expect(result).toEqual(savedPayment);
    });

    it('should reject marking a missing payment as failed', async () => {
      paymentsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.markFailed('payment-1'),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject marking a non-pending payment as failed', async () => {
      paymentsRepository.findOne.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.SUCCESS,
      });

      await expect(
        service.markFailed('payment-1'),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('refund', () => {
    it('should refund a successful payment', async () => {
      const payment = {
        id: 'payment-1',
        status: PaymentStatus.SUCCESS,
      };

      const savedPayment = {
        ...payment,
        status: PaymentStatus.REFUNDED,
      };

      paymentsRepository.findOne.mockResolvedValue(
        payment,
      );

      paymentsRepository.save.mockResolvedValue(
        savedPayment,
      );

      const result = await service.refund(
        'payment-1',
      );

      expect(payment.status).toBe(
        PaymentStatus.REFUNDED,
      );

      expect(
        paymentsRepository.save,
      ).toHaveBeenCalledWith(payment);

      expect(result).toEqual(savedPayment);
    });

    it('should reject refunding a missing payment', async () => {
      paymentsRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.refund('payment-1'),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject refunding a pending payment', async () => {
      paymentsRepository.findOne.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.PENDING,
      });

      await expect(
        service.refund('payment-1'),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject refunding a failed payment', async () => {
      paymentsRepository.findOne.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.FAILED,
      });

      await expect(
        service.refund('payment-1'),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject refunding an already refunded payment', async () => {
      paymentsRepository.findOne.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.REFUNDED,
      });

      await expect(
        service.refund('payment-1'),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(
        paymentsRepository.save,
      ).not.toHaveBeenCalled();
    });
  });
});