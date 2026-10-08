import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Part } from './entities/part.entity.js';
import { CreatePartDto } from './dto/create-part.dto.js';
import { UpdatePartDto } from './dto/update-part.dto.js';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>,
  ) {}

  async create(createPartDto: CreatePartDto): Promise<Part> {
    const part = new Part();

    part.name = createPartDto.name;
    part.description = createPartDto.description ?? null;
    part.price = createPartDto.price;
    part.stock = createPartDto.stock ?? 0;
    part.brand = createPartDto.brand ?? null;
    part.partNumber = createPartDto.partNumber ?? null;

    return this.partsRepository.save(part);
  }

  async findAll(): Promise<Part[]> {
    return this.partsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Part> {
    const part = await this.partsRepository.findOne({
      where: { id },
    });

    if (!part) {
      throw new NotFoundException(`Part #${id} not found`);
    }

    return part;
  }

  async update(
    id: string,
    updatePartDto: UpdatePartDto,
  ): Promise<Part> {
    const part = await this.findOne(id);

    if (updatePartDto.name !== undefined) {
      part.name = updatePartDto.name;
    }

    if (updatePartDto.description !== undefined) {
      part.description = updatePartDto.description;
    }

    if (updatePartDto.price !== undefined) {
      part.price = updatePartDto.price;
    }

    if (updatePartDto.stock !== undefined) {
      part.stock = updatePartDto.stock;
    }

    if (updatePartDto.brand !== undefined) {
      part.brand = updatePartDto.brand;
    }

    if (updatePartDto.partNumber !== undefined) {
      part.partNumber = updatePartDto.partNumber;
    }

    return this.partsRepository.save(part);
  }

  async remove(id: string): Promise<{ message: string }> {
    const part = await this.findOne(id);

    await this.partsRepository.remove(part);

    return {
      message: 'Part deleted successfully',
    };
  }
}