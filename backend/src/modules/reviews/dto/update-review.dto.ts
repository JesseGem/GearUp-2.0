import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class UpdateReviewDto {
  @ApiPropertyOptional({
    example: 4,
    description:
      'Updated rating, from 1 to 5.',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example:
      'Updated comment about the service.',
    description:
      'Updated review comment.',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}