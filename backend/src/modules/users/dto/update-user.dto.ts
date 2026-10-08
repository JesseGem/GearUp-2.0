import {
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description:
      'Updated email address.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'John',
    description:
      'Updated first name.',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description:
      'Updated last name.',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+233201234567',
    description:
      'Updated phone number.',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}