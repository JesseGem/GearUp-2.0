import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class UpdatePartDto {
  @ApiPropertyOptional({
    example: 'Brake Pad Set',
    description:
      'Updated part name.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example:
      'Front brake pads for Toyota Corolla',
    description:
      'Updated part description.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 475,
    description:
      'Updated selling price.',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: 25,
    description:
      'Updated stock quantity.',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: 'Bosch',
    description:
      'Updated manufacturer or brand name.',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    example: 'BP-TOY-2022',
    description:
      'Updated unique part number.',
  })
  @IsOptional()
  @IsString()
  partNumber?: string;
}