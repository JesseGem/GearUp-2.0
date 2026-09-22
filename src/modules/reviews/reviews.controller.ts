import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.userId, createReviewDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.reviewsService.findAllByUser(user.userId);
  }

  @Get('job/:jobId')
  findByJob(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.reviewsService.findByJob(jobId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.findOne(id, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, user.userId, updateReviewDto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.remove(id, user.userId);
  }
}