import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PartsService } from './parts.service.js';

describe('PartsService', () => {
  let service: PartsService;

  const partsRepository = {
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new PartsService(
      partsRepository as any,
    );
  });

  describe('create', () => {
    it('should create a part successfully', async () => {
      const dto = {
        name: 'Brake Pad',
        description: 'Front brake pad set',
        price: 450,
        stock: 20,
        brand: 'Bosch',
        partNumber: 'BP-001',
      };

      const part = {
        id: 'part-1',
        ...dto,
      };

      partsRepository.save.mockResolvedValue(part);

      const result = await service.create(
        dto as any,
      );

      expect(
        partsRepository.save,
      ).toHaveBeenCalled();

      expect(result).toEqual(part);
    });

    it('should create a part when optional fields are omitted', async () => {
      const dto = {
        name: 'Oil Filter',
        description: 'Engine oil filter',
        price: 120,
        stock: 15,
      };

      const part = {
        id: 'part-1',
        name: 'Oil Filter',
        description: 'Engine oil filter',
        price: 120,
        stock: 15,
      };

      partsRepository.save.mockResolvedValue(part);

      const result = await service.create(
        dto as any,
      );

      expect(
        partsRepository.save,
      ).toHaveBeenCalled();

      expect(result).toEqual(part);
    });

    it('should propagate an error when saving a duplicate part number fails', async () => {
      const dto = {
        name: 'Another Brake Pad',
        description: 'Another brake pad',
        price: 500,
        stock: 10,
        partNumber: 'BP-001',
      };

      const databaseError = new Error(
        'duplicate key value violates unique constraint',
      );

      partsRepository.save.mockRejectedValue(
        databaseError,
      );

      await expect(
        service.create(dto as any),
      ).rejects.toBe(databaseError);

      expect(
        partsRepository.save,
      ).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all parts', async () => {
      const parts = [
        {
          id: 'part-1',
          name: 'Brake Pad',
          price: 450,
          stock: 20,
        },
        {
          id: 'part-2',
          name: 'Oil Filter',
          price: 120,
          stock: 15,
        },
      ];

      partsRepository.find.mockResolvedValue(parts);

      const result = await service.findAll();

      expect(
        partsRepository.find,
      ).toHaveBeenCalled();

      expect(result).toEqual(parts);
    });

    it('should return an empty array when no parts exist', async () => {
      partsRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a part when it exists', async () => {
      const part = {
        id: 'part-1',
        name: 'Brake Pad',
        description: 'Front brake pad set',
        price: 450,
        stock: 20,
        partNumber: 'BP-001',
      };

      partsRepository.findOne.mockResolvedValue(part);

      const result = await service.findOne(
        'part-1',
      );

      expect(
        partsRepository.findOne,
      ).toHaveBeenCalled();

      expect(result).toEqual(part);
    });

    it('should reject when the part does not exist', async () => {
      partsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('missing-part'),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an existing part successfully', async () => {
      const part = {
        id: 'part-1',
        name: 'Brake Pad',
        description: 'Front brake pad set',
        price: 450,
        stock: 20,
        brand: 'Bosch',
        partNumber: 'BP-001',
      };

      const dto = {
        name: 'Premium Brake Pad',
        description: 'Premium front brake pad set',
        price: 600,
        stock: 25,
        brand: 'Brembo',
        partNumber: 'BP-001',
      };

      const updatedPart = {
        ...part,
        ...dto,
      };

      partsRepository.findOne.mockResolvedValue(part);

      partsRepository.save.mockResolvedValue(
        updatedPart,
      );

      const result = await service.update(
        'part-1',
        dto as any,
      );

      expect(
        partsRepository.findOne,
      ).toHaveBeenCalled();

      expect(
        partsRepository.save,
      ).toHaveBeenCalled();

      expect(result).toEqual(updatedPart);
    });

    it('should update a part without changing its part number', async () => {
      const part = {
        id: 'part-1',
        name: 'Brake Pad',
        description: 'Front brake pad set',
        price: 450,
        stock: 20,
        partNumber: 'BP-001',
      };

      const dto = {
        price: 500,
        stock: 18,
      };

      const updatedPart = {
        ...part,
        ...dto,
      };

      partsRepository.findOne.mockResolvedValue(part);

      partsRepository.save.mockResolvedValue(
        updatedPart,
      );

      const result = await service.update(
        'part-1',
        dto as any,
      );

      expect(
        partsRepository.save,
      ).toHaveBeenCalled();

      expect(result).toEqual(updatedPart);
    });

    it('should update the part number successfully', async () => {
      const part = {
        id: 'part-1',
        name: 'Brake Pad',
        description: 'Front brake pad set',
        price: 450,
        stock: 20,
        partNumber: 'BP-001',
      };

      const dto = {
        partNumber: 'BP-002',
      };

      const updatedPart = {
        ...part,
        partNumber: 'BP-002',
      };

      partsRepository.findOne.mockResolvedValue(part);

      partsRepository.save.mockResolvedValue(
        updatedPart,
      );

      const result = await service.update(
        'part-1',
        dto as any,
      );

      expect(
        partsRepository.save,
      ).toHaveBeenCalled();

      expect(result).toEqual(updatedPart);
    });

    it('should reject updating a part that does not exist', async () => {
      partsRepository.findOne.mockResolvedValue(null);

      const dto = {
        price: 500,
      };

      await expect(
        service.update(
          'missing-part',
          dto as any,
        ),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        partsRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should propagate a database error when the updated part number violates uniqueness', async () => {
      const part = {
        id: 'part-1',
        name: 'Brake Pad',
        description: 'Front brake pad set',
        price: 450,
        stock: 20,
        partNumber: 'BP-001',
      };

      const dto = {
        partNumber: 'BP-999',
      };

      const databaseError = new Error(
        'duplicate key value violates unique constraint',
      );

      partsRepository.findOne.mockResolvedValue(part);

      partsRepository.save.mockRejectedValue(
        databaseError,
      );

      await expect(
        service.update(
          'part-1',
          dto as any,
        ),
      ).rejects.toBe(databaseError);

      expect(
        partsRepository.save,
      ).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove an existing part', async () => {
      const part = {
        id: 'part-1',
        name: 'Brake Pad',
        description: 'Front brake pad set',
        price: 450,
        stock: 20,
        partNumber: 'BP-001',
      };

      partsRepository.findOne.mockResolvedValue(part);

      partsRepository.remove.mockResolvedValue(part);

      const result = await service.remove(
        'part-1',
      );

      expect(
        partsRepository.remove,
      ).toHaveBeenCalledWith(part);

      expect(result).toEqual({
        message: 'Part deleted successfully',
      });
    });

    it('should reject removing a part that does not exist', async () => {
      partsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('missing-part'),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        partsRepository.remove,
      ).not.toHaveBeenCalled();
    });
  });
});