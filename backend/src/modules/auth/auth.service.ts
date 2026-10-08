import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly jwtService: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ) {
    if (!email || !password) {
      throw new UnauthorizedException(
        'Email and password are required',
      );
    }

    const user = await this.usersRepository.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'This account is inactive',
      );
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken =
      await this.jwtService.signAsync(payload);

    return {
      accessToken,

      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }
}