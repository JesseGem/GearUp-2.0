import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  make!: string;

  @IsString()
  model!: string;

  @IsNumber()
  @Min(1900)
  year!: number;

  @IsString()
  plateNumber!: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  color?: string;
}