import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity';

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}