import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';

@Module({
  imports: [CoreModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}