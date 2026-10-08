import { UserRole } from '../../modules/users/enums/user-role.enum.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}