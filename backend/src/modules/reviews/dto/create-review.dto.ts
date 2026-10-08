import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    example: 5,
    description:
      'Rating given to the service, from 1 to 5.',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    example:
      'Great service and quick work.',
    description:
      'Optional written comment about the service.',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    example:
      '3bd1fb76-4e44-4350-a7a7-ccb0727442fb',
    description:
      'UUID of the job being reviewed.',
    format: 'uuid',
  })
  @IsUUID()
  jobId!: string;
}