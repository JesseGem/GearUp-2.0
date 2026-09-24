import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    const user = this.usersRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      phone: createUserDto.phone ?? undefined,
    });

    const savedUser = await this.usersRepository.save(user);

    return {
      id: savedUser.id,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      phone: savedUser.phone,
      isActive: savedUser.isActive,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }
}