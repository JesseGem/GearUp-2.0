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

import { PartsService } from './parts.service.js';

import { CreatePartDto } from './dto/create-part.dto.js';
import { UpdatePartDto } from './dto/update-part.dto.js';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@ApiTags('Parts')
@Controller('parts')
export class PartsController {
  constructor(
    private readonly partsService: PartsService,
  ) {}

  // Public: browse the parts catalogue
  @Get()
  @ApiOperation({
    summary: 'List parts',
    description:
      'Retrieve the parts catalogue. This endpoint is publicly accessible.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Parts retrieved successfully.',
  })
  findAll() {
    return this.partsService.findAll();
  }

  // Public: view a specific part
  @Get(':id')
  @ApiOperation({
    summary: 'Get a part',
    description:
      'Retrieve a specific part from the catalogue. This endpoint is publicly accessible.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the part.',
    example:
      '3bd1fb76-4e44-4350-a7a7-ccb0727442fb',
  })
  @ApiResponse({
    status: 200,
    description:
      'Part retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid part UUID.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Part not found.',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partsService.findOne(id);
  }

  // Mechanic/Admin only
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.MECHANIC,
    UserRole.ADMIN,
  )
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a part',
    description:
      'Add a new part to the catalogue. Only mechanics and administrators can create parts.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Part created successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid part data.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authenticated user is not a mechanic or administrator.',
  })
  @ApiResponse({
    status: 409,
    description:
      'A part with the specified part number already exists.',
  })
  create(
    @Body() createPartDto: CreatePartDto,
  ) {
    return this.partsService.create(
      createPartDto,
    );
  }

  // Mechanic/Admin only
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.MECHANIC,
    UserRole.ADMIN,
  )
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update a part',
    description:
      'Update an existing part in the catalogue. Only mechanics and administrators can update parts.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the part to update.',
    example:
      '3bd1fb76-4e44-4350-a7a7-ccb0727442fb',
  })
  @ApiResponse({
    status: 200,
    description:
      'Part updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid part UUID or part data.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authenticated user is not a mechanic or administrator.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Part not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'A part with the specified part number already exists.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePartDto: UpdatePartDto,
  ) {
    return this.partsService.update(
      id,
      updatePartDto,
    );
  }

  // Mechanic/Admin only
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.MECHANIC,
    UserRole.ADMIN,
  )
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a part',
    description:
      'Remove a part from the catalogue. Only mechanics and administrators can delete parts.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the part to delete.',
    example:
      '3bd1fb76-4e44-4350-a7a7-ccb0727442fb',
  })
  @ApiResponse({
    status: 200,
    description:
      'Part deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid part UUID.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authenticated user is not a mechanic or administrator.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Part not found.',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partsService.remove(id);
  }
}