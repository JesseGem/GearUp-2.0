import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import { PaymentMethod } from '../entities/payment.entity.js';

export class CreatePaymentDto {
  @ApiProperty({
    example: 1350,
    description:
      'Payment amount.',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
    description:
      'Payment method used for the transaction.',
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({
    example:
      '3bd1fb76-4e44-4350-a7a7-ccb0727442fb',
    description:
      'Optional UUID of the associated job.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({
    example: 'MM-TEST-001',
    description:
      'Optional external payment reference.',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    example:
      'GearUp mobile money test payment.',
    description:
      'Optional payment notes.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}