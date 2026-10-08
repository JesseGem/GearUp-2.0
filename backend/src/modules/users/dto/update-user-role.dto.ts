import { IsEnum } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { UserRole } from '../enums/user-role.enum.js';

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: [
      UserRole.CUSTOMER,
      UserRole.MECHANIC,
    ],
    example: UserRole.MECHANIC,
    description:
      'The role to assign to the user. The administrator role cannot be assigned through this endpoint.',
  })
  @IsEnum(UserRole)
  role!: UserRole;
}