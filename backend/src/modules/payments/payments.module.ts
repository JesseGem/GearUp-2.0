import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

import { Payment } from './entities/payment.entity.js';
import { Job } from '../jobs/entities/job.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Job,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}