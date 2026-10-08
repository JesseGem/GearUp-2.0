import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class UpdateVehicleDto {
  @ApiPropertyOptional({
    example: 'Toyota',
    description:
      'Updated vehicle manufacturer.',
  })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional({
    example: 'Corolla',
    description:
      'Updated vehicle model.',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: 2023,
    description:
      'Updated vehicle manufacturing year.',
    minimum: 1900,
  })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @ApiPropertyOptional({
    example: 'GT-7843-26',
    description:
      'Updated vehicle registration/plate number.',
  })
  @IsOptional()
  @IsString()
  plateNumber?: string;

  @ApiPropertyOptional({
    example: 'JTDBU4EE9B9987654',
    description:
      'Updated vehicle identification number (VIN).',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  vin?: string | null;

  @ApiPropertyOptional({
    example: 'Black',
    description:
      'Updated vehicle color.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  color?: string | null;
}