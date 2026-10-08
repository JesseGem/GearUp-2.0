import {
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

export class CreateJobDto {
  @ApiProperty({
    example: 'Engine diagnostic',
    description:
      'Short title describing the requested vehicle service.',
  })
  @IsString()
  title!: string;

  @ApiPropertyOptional({
    example:
      'Engine making unusual noise during acceleration.',
    description:
      'Optional detailed description of the service request.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example:
      'a52e62f5-66a9-4c63-9a59-d7a05272c24d',
    description:
      'UUID of a vehicle belonging to the authenticated customer.',
    format: 'uuid',
  })
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional({
    example: 1200,
    description:
      'Estimated service cost.',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;
}