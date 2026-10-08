import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({
    example: 'Toyota',
    description: 'Vehicle manufacturer.',
  })
  @IsString()
  make!: string;

  @ApiProperty({
    example: 'Corolla',
    description: 'Vehicle model.',
  })
  @IsString()
  model!: string;

  @ApiProperty({
    example: 2022,
    description: 'Vehicle manufacturing year.',
    minimum: 1900,
  })
  @IsNumber()
  @Min(1900)
  year!: number;

  @ApiProperty({
    example: 'GT-7843-26',
    description:
      'Unique vehicle registration/plate number.',
  })
  @IsString()
  plateNumber!: string;

  @ApiPropertyOptional({
    example: 'JTDBU4EE9B9987654',
    description:
      'Optional vehicle identification number (VIN).',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  vin?: string | null;

  @ApiPropertyOptional({
    example: 'Silver',
    description:
      'Optional vehicle color.',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  color?: string | null;
}