import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Review } from './entities/review.entity.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  private readonly reviews: Review[] = [];

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const review: Review = {
      id: randomUUID(),
      createdAt: new Date(),
      ...createReviewDto,
      userId,
    };
    this.reviews.push(review);
    return review;
  }

  async findAllByUser(userId: string): Promise<Review[]> {
    return this.reviews
      .filter((review) => review.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async findByJob(jobId: string): Promise<Review[]> {
    return this.reviews
      .filter((review) => review.jobId === jobId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async findOne(id: string, userId: string): Promise<Review> {
    const review = this.reviews.find(
      (candidate) => candidate.id === id && candidate.userId === userId,
    );

    if (!review) {
      throw new NotFoundException(`Review #${id} not found`);
    }

    return review;
  }

  async update(
    id: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.findOne(id, userId);
    Object.assign(review, updateReviewDto);
    return review;
  }

  async remove(id: string, userId: string): Promise<void> {
    const index = this.reviews.findIndex(
      (review) => review.id === id && review.userId === userId,
    );
    if (index === -1) {
      throw new NotFoundException(`Review #${id} not found`);
    }
    this.reviews.splice(index, 1);
  }
}