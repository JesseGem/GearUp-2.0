import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class UpdateJobDto {
  @ApiPropertyOptional({
    example: 'Brake inspection',
    description:
      'Updated job title.',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example:
      'Inspect front and rear brake components.',
    description:
      'Updated service description.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 850,
    description:
      'Updated estimated service cost.',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;
}