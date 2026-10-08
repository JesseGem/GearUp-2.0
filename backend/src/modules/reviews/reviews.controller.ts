import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ReviewsService } from './reviews.service.js';

import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

import { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Create a review',
    description:
      'Create one review for a completed job owned by the authenticated customer.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Review created successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid review data.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Only customers can create reviews, and the job must be completed.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Job not found or does not belong to the authenticated customer.',
  })
  @ApiResponse({
    status: 409,
    description:
      'The customer has already reviewed this job.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(
      user.userId,
      createReviewDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List my reviews',
    description:
      'Retrieve reviews created by the authenticated customer.',
  })
  @ApiResponse({
    status: 200,
    description:
      'User reviews retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.findAllByUser(
      user.userId,
    );
  }

  @Get('job/:jobId')
  @ApiOperation({
    summary: 'Get reviews for a job',
    description:
      'Retrieve reviews for a job. Access is limited to the job owner, the mechanic assigned to the job, or an administrator.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'UUID of the job.',
    example:
      '3bd1fb76-4e44-4350-a7a7-ccb0727442fb',
  })
  @ApiResponse({
    status: 200,
    description:
      'Job reviews retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid job UUID.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Job not found or not accessible to the authenticated user.',
  })
  findByJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.findByJob(
      jobId,
      user,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a review',
    description:
      'Retrieve a review created by the authenticated customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the review.',
    example:
      '3bd1fb76-4e44-4350-a7a7-ccb0727442fb',
  })
  @ApiResponse({
    status: 200,
    description:
      'Review retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid review UUID.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Review not found or does not belong to the authenticated customer.',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.findOne(
      id,
      user.userId,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Update a review',
    description:
      'Update the rating or comment of a review created by the authenticated customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the review to update.',
    example:
      '3bd1fb76-4e44-4350-a7a7-ccb0727442fb',
  })
  @ApiResponse({
    status: 200,
    description:
      'Review updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid review UUID, rating, or review data.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Only customers can update reviews.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Review not found or does not belong to the authenticated customer.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(
      id,
      user.userId,
      updateReviewDto,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Delete a review',
    description:
      'Delete a review created by the authenticated customer.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the review to delete.',
    example:
      '3bd1fb76-4e44-4350-a7a7-ccb0727442fb',
  })
  @ApiResponse({
    status: 200,
    description:
      'Review deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid review UUID.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Only customers can delete reviews.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Review not found or does not belong to the authenticated customer.',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.remove(
      id,
      user.userId,
    );
  }
}