import { IsString, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateJobDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;
}