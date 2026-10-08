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

import { VehiclesService } from './vehicles.service.js';

import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Vehicles')
@ApiBearerAuth('access-token')
@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a vehicle',
    description:
      'Create a vehicle belonging to the currently authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Vehicle created successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid vehicle data.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 409,
    description:
      'A vehicle with the specified plate number already exists.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(
      user.userId,
      createVehicleDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List my vehicles',
    description:
      'Retrieve all vehicles belonging to the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description:
      'User vehicles retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.findAllByUser(
      user.userId,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a vehicle',
    description:
      'Retrieve a specific vehicle belonging to the currently authenticated user.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the vehicle.',
    example:
      'a52e62f5-66a9-4c63-9a59-d7a05272c24d',
  })
  @ApiResponse({
    status: 200,
    description:
      'Vehicle retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid vehicle UUID.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Vehicle not found or does not belong to the authenticated user.',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.findOne(
      id,
      user.userId,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a vehicle',
    description:
      'Update a vehicle belonging to the currently authenticated user.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the vehicle to update.',
    example:
      'a52e62f5-66a9-4c63-9a59-d7a05272c24d',
  })
  @ApiResponse({
    status: 200,
    description:
      'Vehicle updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid UUID or vehicle data.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Vehicle not found or does not belong to the authenticated user.',
  })
  @ApiResponse({
    status: 409,
    description:
      'A vehicle with the specified plate number already exists.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(
      id,
      user.userId,
      updateVehicleDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a vehicle',
    description:
      'Delete a vehicle belonging to the currently authenticated user.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the vehicle to delete.',
    example:
      'a52e62f5-66a9-4c63-9a59-d7a05272c24d',
  })
  @ApiResponse({
    status: 200,
    description:
      'Vehicle deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid vehicle UUID.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Vehicle not found or does not belong to the authenticated user.',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.remove(
      id,
      user.userId,
    );
  }
}