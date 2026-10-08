import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  Throttle,
  minutes,
} from '@nestjs/throttler';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @Throttle({
    default: {
      limit: 5,
      ttl: minutes(15),
    },
  })
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticate a user and receive a JWT access token.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful. Returns a JWT access token and safe user information.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Invalid email/password or inactive account.',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too many login attempts. Try again later.',
  })
  login(
    @Body() loginDto: LoginDto,
  ) {
    return this.authService.login(
      loginDto.email,
      loginDto.password,
    );
  }
}