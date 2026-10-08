import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UsersService } from './users.service.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

import { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { UserRole } from './enums/user-role.enum.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // Public registration
  @Post()
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new customer account. Newly registered users are assigned the customer role by the backend.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid request data.',
  })
  @ApiResponse({
    status: 409,
    description:
      'A user with this email already exists.',
  })
  create(
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(
      createUserDto,
    );
  }

  // Admin-only user listing
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List all users',
    description:
      'Retrieve all registered users. This endpoint is restricted to administrators.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Users retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing or invalid.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authenticated user is not an administrator.',
  })
  findAll() {
    return this.usersService.findAll();
  }

  // Authenticated user's own profile
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get my profile',
    description:
      'Retrieve the profile of the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Current user profile retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the account is inactive.',
  })
  findMe(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.findOne(
      user.userId,
    );
  }

  // Authenticated user changes their own password
  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change my password',
    description:
      'Change the password of the currently authenticated user by providing the current password and a new password.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Password changed successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'New password is invalid or identical to the current password.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication failed or the current password is incorrect.',
  })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      user.userId,
      changePasswordDto,
    );
  }

  // Admin changes another user's role
  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change a user role',
    description:
      'Change another user role. Only administrators can use this endpoint, and the administrator role cannot be assigned through this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the user whose role will be changed.',
    example:
      '110c1ef0-cbec-4524-b3c5-33ef0dbb1a0d',
  })
  @ApiResponse({
    status: 200,
    description:
      'User role updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid UUID or request data.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing or invalid.',
  })
  @ApiResponse({
    status: 403,
    description:
      'User is not an administrator, is attempting to change their own role, or is attempting to assign the administrator role.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(
      id,
      user.userId,
      updateUserRoleDto,
    );
  }

  // Admin deactivates another user's account
  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Deactivate a user account',
    description:
      'Deactivate another user account. A deactivated user cannot successfully authenticate or use protected endpoints.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the user to deactivate.',
    example:
      '110c1ef0-cbec-4524-b3c5-33ef0dbb1a0d',
  })
  @ApiResponse({
    status: 200,
    description:
      'User account deactivated successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Account is already inactive.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing or invalid.',
  })
  @ApiResponse({
    status: 403,
    description:
      'User is not an administrator or is attempting to deactivate their own account.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.deactivate(
      id,
      user.userId,
    );
  }

  // Admin reactivates a user's account
  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Activate a user account',
    description:
      'Reactivate an inactive user account. Only administrators can use this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the user to activate.',
    example:
      '110c1ef0-cbec-4524-b3c5-33ef0dbb1a0d',
  })
  @ApiResponse({
    status: 200,
    description:
      'User account activated successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Account is already active.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing or invalid.',
  })
  @ApiResponse({
    status: 403,
    description:
      'User is not an administrator.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.activate(id);
  }

  // User updates their own profile
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update my profile',
    description:
      'Update the currently authenticated user profile. Users can only modify their own profile.',
  })
  @ApiParam({
    name: 'id',
    description:
      'UUID of the authenticated user.',
    example:
      '110c1ef0-cbec-4524-b3c5-33ef0dbb1a0d',
  })
  @ApiResponse({
    status: 200,
    description:
      'User profile updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid request data or UUID.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication token is missing, invalid, or the ID does not match the authenticated user.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'A user with the specified email already exists.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    updateUserDto: UpdateUserDto,
  ) {
    if (id !== user.userId) {
      throw new UnauthorizedException(
        'You can only update your own profile',
      );
    }

    return this.usersService.update(
      id,
      updateUserDto,
    );
  }
}