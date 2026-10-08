import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'customer@example.com',
    description:
      'Unique email address for the new account.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'Password for the new account. Must be at least 8 characters.',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name.',
  })
  @IsString()
  firstName!: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name.',
  })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({
    example: '+233201234567',
    description:
      'Optional phone number.',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}