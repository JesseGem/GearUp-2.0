import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Vehicle } from './entities/vehicle.entity.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(
    userId: string,
    createVehicleDto: CreateVehicleDto,
  ): Promise<Vehicle> {
    const existingVehicle = await this.vehiclesRepository.findOne({
      where: {
        plateNumber: createVehicleDto.plateNumber,
      },
    });

    if (existingVehicle) {
      throw new ConflictException(
        'A vehicle with this plate number already exists',
      );
    }

    const vehicle = this.vehiclesRepository.create({
      ...createVehicleDto,
      vin: createVehicleDto.vin ?? undefined,
      color: createVehicleDto.color ?? undefined,
      userId,
    });

    return this.vehiclesRepository.save(vehicle);
  }

  async findAllByUser(
    userId: string,
  ): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({
      where: { userId },
    });
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!vehicle) {
      throw new NotFoundException(
        'Vehicle not found or does not belong to this user',
      );
    }

    return vehicle;
  }

  async update(
    id: string,
    userId: string,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.findOne(id, userId);

    if (updateVehicleDto.plateNumber !== undefined) {
      const existingVehicle = await this.vehiclesRepository.findOne({
        where: {
          plateNumber: updateVehicleDto.plateNumber,
        },
      });

      if (
        existingVehicle &&
        existingVehicle.id !== id
      ) {
        throw new ConflictException(
          'A vehicle with this plate number already exists',
        );
      }

      vehicle.plateNumber = updateVehicleDto.plateNumber;
    }

    if (updateVehicleDto.make !== undefined) {
      vehicle.make = updateVehicleDto.make;
    }

    if (updateVehicleDto.model !== undefined) {
      vehicle.model = updateVehicleDto.model;
    }

    if (updateVehicleDto.year !== undefined) {
      vehicle.year = updateVehicleDto.year;
    }

    if (updateVehicleDto.vin !== undefined) {
      vehicle.vin = updateVehicleDto.vin ?? '';
    }

    if (updateVehicleDto.color !== undefined) {
      vehicle.color = updateVehicleDto.color ?? '';
    }

    return this.vehiclesRepository.save(vehicle);
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ message: string }> {
    const vehicle = await this.findOne(id, userId);

    await this.vehiclesRepository.remove(vehicle);

    return {
      message: 'Vehicle deleted successfully',
    };
  }
}