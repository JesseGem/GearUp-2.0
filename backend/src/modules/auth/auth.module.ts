import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret =
          configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
          throw new Error(
            'JWT_SECRET is not configured in the environment',
          );
        }

        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: '1d',
          },
        };
      },
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    JwtStrategy,
  ],

  exports: [
    JwtModule,
    AuthService,
  ],
})
export class AuthModule {}