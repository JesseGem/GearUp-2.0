import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';

import { Repository } from 'typeorm';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import { User } from '../../users/entities/user.entity.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    const jwtSecret =
      configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET is not configured in the environment',
      );
    }

    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: jwtSecret,
    });
  }

  async validate(
    payload: AuthenticatedUser,
  ): Promise<AuthenticatedUser> {
    const user = await this.usersRepository.findOne({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'User account not found',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'This account is inactive',
      );
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}