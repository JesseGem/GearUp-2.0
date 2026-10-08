import {
  Body,
  Controller,
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

import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

import { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  // Customers create their own payment requests
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Create a payment',
    description:
      'Create a payment record for the authenticated customer. New payments start with pending status.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Payment created successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid payment amount, method, job UUID, or payment data.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Only customers can create payments.',
  })
  @ApiResponse({
    status: 404,
    description:
      'The specified job does not exist or does not belong to the authenticated customer.',
  })
  @ApiResponse({
    status: 409,
    description:
      'The associated job has already been successfully paid.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(
      user.userId,
      createPaymentDto,
    );
  }

  // Customers see their payments.
  // Admins see all payments.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
  )
  @ApiOperation({
    summary: 'List payments',
    description:
      'Customers receive their own payment records. Administrators receive all payment records.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Payments retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authenticated user does not have permission to view payments.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.findAll(user);
  }

  // Customers can see their own payments.
  // Admins can see any payment.
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
  )
  @ApiOperation({
    summary: 'Get a payment',
    description:
      'Retrieve a specific payment. Customers can access their own payments, while administrators can access any payment.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the payment.',
    example:
      '7494d6b3-f1ed-4a78-b7a6-d9a61159fd09',
  })
  @ApiResponse({
    status: 200,
    description:
      'Payment retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid payment UUID.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authenticated user does not have permission to access payments.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Payment not found or is not accessible to the authenticated user.',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.findOne(
      id,
      user,
    );
  }

  // Internal/admin payment confirmation
  @Patch(':id/success')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Mark payment as successful',
    description:
      'Transition a pending payment to successful status. Only administrators can currently perform this internal operation.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the payment.',
    example:
      '7494d6b3-f1ed-4a78-b7a6-d9a61159fd09',
  })
  @ApiResponse({
    status: 200,
    description:
      'Payment marked as successful.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Payment is not in pending status or the associated job is cancelled.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Only administrators can mark payments as successful.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Payment not found.',
  })
  markSuccess(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.markSuccess(id);
  }

  // Internal/admin payment failure
  @Patch(':id/failed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Mark payment as failed',
    description:
      'Transition a pending payment to failed status. Only administrators can currently perform this internal operation.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the payment.',
    example:
      '7494d6b3-f1ed-4a78-b7a6-d9a61159fd09',
  })
  @ApiResponse({
    status: 200,
    description:
      'Payment marked as failed.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Payment is not in pending status.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Only administrators can mark payments as failed.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Payment not found.',
  })
  markFailed(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.markFailed(id);
  }

  // Refund a successful payment
  @Patch(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Refund a payment',
    description:
      'Transition a successful payment to refunded status. Only administrators can currently perform this internal operation.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the payment.',
    example:
      '7494d6b3-f1ed-4a78-b7a6-d9a61159fd09',
  })
  @ApiResponse({
    status: 200,
    description:
      'Payment refunded successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Only successful payments can be refunded.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Only administrators can refund payments.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Payment not found.',
  })
  refund(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.refund(id);
  }
}