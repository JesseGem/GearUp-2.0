import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';
import { Review } from './entities/review.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}