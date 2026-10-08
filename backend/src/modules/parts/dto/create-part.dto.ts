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

export class CreatePartDto {
  @ApiProperty({
    example: 'Brake Pad Set',
    description:
      'Name of the vehicle part.',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example:
      'Front brake pads for Toyota Corolla',
    description:
      'Description of the part.',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    example: 450,
    description:
      'Selling price of the part.',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    example: 20,
    description:
      'Number of units currently in stock.',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({
    example: 'Bosch',
    description:
      'Optional manufacturer or brand name.',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    example: 'BP-TOY-2022',
    description:
      'Optional unique part number.',
  })
  @IsOptional()
  @IsString()
  partNumber?: string;
}