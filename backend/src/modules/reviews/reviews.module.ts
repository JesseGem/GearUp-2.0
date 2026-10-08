import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';
import { Review } from './entities/review.entity.js';
import { Job } from '../jobs/entities/job.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Review,
      Job,
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}