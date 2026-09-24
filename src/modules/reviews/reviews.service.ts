import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const review = this.reviewsRepository.create({
      ...createReviewDto,
      userId,
    });
    return this.reviewsRepository.save(review);
  }

  async findAllByUser(userId: string): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: { userId },
      relations: { job: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByJob(jobId: string): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: { jobId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id, userId },
      relations: { job: true },
    });

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
    return this.reviewsRepository.save(review);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.reviewsRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException(`Review #${id} not found`);
    }
  }
}