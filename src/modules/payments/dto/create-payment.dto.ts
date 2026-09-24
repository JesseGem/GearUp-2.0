import { IsNumber, IsEnum, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
