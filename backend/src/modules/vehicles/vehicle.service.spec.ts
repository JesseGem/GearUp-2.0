import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VehiclesService } from './vehicles.service.js';

describe('VehiclesService', () => {
  let service: VehiclesService;

  const vehiclesRepository = {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new VehiclesService(
      vehiclesRepository as any,
    );
  });

  describe('create', () => {
    it('should create a vehicle successfully', async () => {
      const dto = {
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        plateNumber: 'GT-1234-22',
        vin: '1HGCM82633A123456',
        color: 'Black',
      };

      const vehicle = {
        id: 'vehicle-1',
        ...dto,
        userId: 'user-1',
      };

      vehiclesRepository.findOne.mockResolvedValue(
        null,
      );

      vehiclesRepository.create.mockReturnValue(
        vehicle,
      );

      vehiclesRepository.save.mockResolvedValue(
        vehicle,
      );

      const result = await service.create(
        'user-1',
        dto as any,
      );

      expect(
        vehiclesRepository.findOne,
      ).toHaveBeenCalled();

      expect(
        vehiclesRepository.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          plateNumber: 'GT-1234-22',
          vin: '1HGCM82633A123456',
          color: 'Black',
          userId: 'user-1',
        }),
      );

      expect(
        vehiclesRepository.save,
      ).toHaveBeenCalledWith(vehicle);

      expect(result).toEqual(vehicle);
    });

    it('should create a vehicle when optional fields are omitted', async () => {
      const dto = {
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        plateNumber: 'GR-5678-21',
      };

      const vehicle = {
        id: 'vehicle-1',
        make: 'Honda',
        model: 'Civic',
        year: 2021,
        plateNumber: 'GR-5678-21',
        vin: undefined,
        color: undefined,
        userId: 'user-1',
      };

      vehiclesRepository.findOne.mockResolvedValue(
        null,
      );

      vehiclesRepository.create.mockReturnValue(
        vehicle,
      );

      vehiclesRepository.save.mockResolvedValue(
        vehicle,
      );

      const result = await service.create(
        'user-1',
        dto as any,
      );

      expect(
        vehiclesRepository.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          make: 'Honda',
          model: 'Civic',
          year: 2021,
          plateNumber: 'GR-5678-21',
          userId: 'user-1',
        }),
      );

      expect(result).toEqual(vehicle);
    });

    it('should reject a duplicate plate number', async () => {
      vehiclesRepository.findOne.mockResolvedValue({
        id: 'existing-vehicle',
        plateNumber: 'GT-1234-22',
        userId: 'user-2',
      });

      const dto = {
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        plateNumber: 'GT-1234-22',
      };

      await expect(
        service.create('user-1', dto as any),
      ).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(
        vehiclesRepository.create,
      ).not.toHaveBeenCalled();

      expect(
        vehiclesRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('should return only vehicles belonging to the user', async () => {
      const vehicles = [
        {
          id: 'vehicle-1',
          make: 'Toyota',
          model: 'Camry',
          userId: 'user-1',
        },
        {
          id: 'vehicle-2',
          make: 'Honda',
          model: 'Civic',
          userId: 'user-1',
        },
      ];

      vehiclesRepository.find.mockResolvedValue(
        vehicles,
      );

      const result = await service.findAllByUser(
        'user-1',
      );

      expect(
        vehiclesRepository.find,
      ).toHaveBeenCalled();

      expect(result).toEqual(vehicles);
    });

    it('should return an empty array when the user has no vehicles', async () => {
      vehiclesRepository.find.mockResolvedValue([]);

      const result = await service.findAllByUser(
        'user-1',
      );

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a vehicle belonging to the user', async () => {
      const vehicle = {
        id: 'vehicle-1',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        plateNumber: 'GT-1234-22',
        userId: 'user-1',
      };

      vehiclesRepository.findOne.mockResolvedValue(
        vehicle,
      );

      const result = await service.findOne(
        'vehicle-1',
        'user-1',
      );

      expect(
        vehiclesRepository.findOne,
      ).toHaveBeenCalled();

      expect(result).toEqual(vehicle);
    });

    it('should reject access to another user vehicle', async () => {
      vehiclesRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.findOne(
          'vehicle-1',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should reject a vehicle that does not exist', async () => {
      vehiclesRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.findOne(
          'missing-vehicle',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a vehicle belonging to the user', async () => {
      const vehicle = {
        id: 'vehicle-1',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        plateNumber: 'GT-1234-22',
        vin: '1HGCM82633A123456',
        color: 'Black',
        userId: 'user-1',
      };

      const dto = {
        make: 'Toyota',
        model: 'Corolla',
        year: 2023,
        plateNumber: 'GT-1234-22',
        vin: '1HGCM82633A123456',
        color: 'White',
      };

      vehiclesRepository.findOne
        .mockResolvedValueOnce(vehicle)
        .mockResolvedValueOnce(null);

      vehiclesRepository.save.mockResolvedValue({
        ...vehicle,
        ...dto,
      });

      const result = await service.update(
        'vehicle-1',
        'user-1',
        dto as any,
      );

      expect(
        vehiclesRepository.save,
      ).toHaveBeenCalled();

      expect(result).toEqual({
        ...vehicle,
        ...dto,
      });
    });

    it('should update a vehicle when the plate number remains unchanged', async () => {
      const vehicle = {
        id: 'vehicle-1',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        plateNumber: 'GT-1234-22',
        vin: null,
        color: null,
        userId: 'user-1',
      };

      const dto = {
        model: 'Corolla',
        plateNumber: 'GT-1234-22',
      };

      vehiclesRepository.findOne.mockResolvedValue(
        vehicle,
      );

      vehiclesRepository.save.mockResolvedValue({
        ...vehicle,
        ...dto,
      });

      const result = await service.update(
        'vehicle-1',
        'user-1',
        dto as any,
      );

      expect(
        vehiclesRepository.save,
      ).toHaveBeenCalled();

      expect(result).toEqual({
        ...vehicle,
        ...dto,
      });
    });

    it('should reject updating a vehicle that does not belong to the user', async () => {
      vehiclesRepository.findOne.mockResolvedValue(
        null,
      );

      const dto = {
        model: 'Corolla',
      };

      await expect(
        service.update(
          'vehicle-1',
          'user-1',
          dto as any,
        ),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        vehiclesRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject changing to a plate number already used by another vehicle', async () => {
      const vehicle = {
        id: 'vehicle-1',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        plateNumber: 'GT-1234-22',
        userId: 'user-1',
      };

      const conflictingVehicle = {
        id: 'vehicle-2',
        plateNumber: 'GR-9999-24',
        userId: 'user-2',
      };

      vehiclesRepository.findOne
        .mockResolvedValueOnce(vehicle)
        .mockResolvedValueOnce(
          conflictingVehicle,
        );

      const dto = {
        plateNumber: 'GR-9999-24',
      };

      await expect(
        service.update(
          'vehicle-1',
          'user-1',
          dto as any,
        ),
      ).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(
        vehiclesRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a vehicle belonging to the user', async () => {
      const vehicle = {
        id: 'vehicle-1',
        make: 'Toyota',
        model: 'Camry',
        plateNumber: 'GT-1234-22',
        userId: 'user-1',
      };

      vehiclesRepository.findOne.mockResolvedValue(
        vehicle,
      );

      vehiclesRepository.remove.mockResolvedValue(
        vehicle,
      );

      const result = await service.remove(
        'vehicle-1',
        'user-1',
      );

      expect(
        vehiclesRepository.remove,
      ).toHaveBeenCalledWith(vehicle);

      expect(result).toEqual({
        message: 'Vehicle deleted successfully',
      });
    });

    it('should reject removing a vehicle that does not belong to the user', async () => {
      vehiclesRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.remove(
          'vehicle-1',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        vehiclesRepository.remove,
      ).not.toHaveBeenCalled();
    });

    it('should reject removing a vehicle that does not exist', async () => {
      vehiclesRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.remove(
          'missing-vehicle',
          'user-1',
        ),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        vehiclesRepository.remove,
      ).not.toHaveBeenCalled();
    });
  });
});