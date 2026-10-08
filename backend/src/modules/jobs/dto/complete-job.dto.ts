import {
  IsNumber,
  Min,
} from 'class-validator';

export class CompleteJobDto {
  @IsNumber()
  @Min(0)
  finalCost!: number;
}
