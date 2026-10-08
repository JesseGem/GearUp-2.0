import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import * as bcrypt from 'bcrypt';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './enums/user-role.enum.js';

describe('UsersService', () => {
  let usersService: UsersService;

  const usersRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const createTestUser = (
    overrides: Partial<User> = {},
  ): User => {
    return {
      id: 'user-123',
      email: 'customer@example.com',
      password: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+233201234567',
      role: UserRole.CUSTOMER,
      isActive: true,
      createdAt: new Date(
        '2026-01-01T00:00:00.000Z',
      ),
      updatedAt: new Date(
        '2026-01-01T00:00:00.000Z',
      ),
      ...overrides,
    } as User;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    usersService = new UsersService(
      usersRepository as never,
    );
  });

  describe('findAll', () => {
    it('should return users without password hashes', async () => {
      const users = [
        createTestUser(),
        createTestUser({
          id: 'user-456',
          email: 'mechanic@example.com',
          role: UserRole.MECHANIC,
        }),
      ];

      usersRepository.find.mockResolvedValue(
        users,
      );

      const result =
        await usersService.findAll();

      expect(result).toHaveLength(2);

      expect(result[0]).toMatchObject({
        id: 'user-123',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        isActive: true,
      });

      expect(result[0]).not.toHaveProperty(
        'password',
      );

      expect(
        usersRepository.find,
      ).toHaveBeenCalledWith({
        order: {
          createdAt: 'DESC',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a safe user profile', async () => {
      const user = createTestUser();

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      const result =
        await usersService.findOne(
          user.id,
        );

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

      expect(result).not.toHaveProperty(
        'password',
      );
    });

    it('should throw when the user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(
        null,
      );

      await expect(
        usersService.findOne('missing-user'),
      ).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('create', () => {
    it('should create a new customer with a hashed password', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+233200000000',
      };

      usersRepository.findOne.mockResolvedValue(
        null,
      );

      usersRepository.create.mockImplementation(
        (data) => data,
      );

      const savedUser = createTestUser({
        id: 'new-user',
        email: dto.email,
        password: 'hashed-password',
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.CUSTOMER,
      });

      usersRepository.save.mockResolvedValue(
        savedUser,
      );

      const result =
        await usersService.create(dto);

      expect(
        usersRepository.findOne,
      ).toHaveBeenCalledWith({
        where: {
          email: dto.email,
        },
      });

      expect(
        usersRepository.create,
      ).toHaveBeenCalled();

      const createCall =
        usersRepository.create.mock.calls[0][0];

      expect(createCall.email).toBe(
        dto.email,
      );

      expect(createCall.role).toBe(
        UserRole.CUSTOMER,
      );

      expect(createCall.password).not.toBe(
        dto.password,
      );

      expect(
        await bcrypt.compare(
          dto.password,
          createCall.password,
        ),
      ).toBe(true);

      expect(result).not.toHaveProperty(
        'password',
      );
      expect(result.role).toBe(
        UserRole.CUSTOMER,
      );
    });

    it('should reject duplicate email addresses', async () => {
      usersRepository.findOne.mockResolvedValue(
        createTestUser(),
      );

      await expect(
        usersService.create({
          email: 'customer@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(
        'A user with this email already exists',
      );

      expect(
        usersRepository.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change the password successfully', async () => {
      const currentPassword =
        'CurrentPassword123!';

      const hashedPassword =
        await bcrypt.hash(
          currentPassword,
          10,
        );

      const user = createTestUser({
        password: hashedPassword,
      });

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      usersRepository.save.mockResolvedValue(
        user,
      );

      const result =
        await usersService.changePassword(
          user.id,
          {
            currentPassword,
            newPassword:
              'NewPassword456!',
          },
        );

      expect(result).toEqual({
        message:
          'Password changed successfully',
      });

      expect(
        usersRepository.save,
      ).toHaveBeenCalledWith(user);

      expect(
        await bcrypt.compare(
          'NewPassword456!',
          user.password,
        ),
      ).toBe(true);
    });

    it('should reject an incorrect current password', async () => {
      const user =
        createTestUser({
          password:
            await bcrypt.hash(
              'CorrectPassword123!',
              10,
            ),
        });

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      await expect(
        usersService.changePassword(
          user.id,
          {
            currentPassword:
              'WrongPassword123!',
            newPassword:
              'NewPassword456!',
          },
        ),
      ).rejects.toThrow(
        'Current password is incorrect',
      );

      expect(
        usersRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject using the same password', async () => {
      const currentPassword =
        'CurrentPassword123!';

      const user =
        createTestUser({
          password:
            await bcrypt.hash(
              currentPassword,
              10,
            ),
        });

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      await expect(
        usersService.changePassword(
          user.id,
          {
            currentPassword,
            newPassword:
              currentPassword,
          },
        ),
      ).rejects.toThrow(
        'New password must be different from the current password',
      );

      expect(
        usersRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('should allow an administrator to change another user to mechanic', async () => {
      const targetUser =
        createTestUser({
          id: 'target-user',
          role: UserRole.CUSTOMER,
        });

      usersRepository.findOne.mockResolvedValue(
        targetUser,
      );

      usersRepository.save.mockResolvedValue(
        {
          ...targetUser,
          role: UserRole.MECHANIC,
        },
      );

      const result =
        await usersService.updateRole(
          targetUser.id,
          'admin-user',
          {
            role: UserRole.MECHANIC,
          },
        );

      expect(result.role).toBe(
        UserRole.MECHANIC,
      );
    });

    it('should prevent a user from changing their own role', async () => {
      const user =
        createTestUser();

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      await expect(
        usersService.updateRole(
          user.id,
          user.id,
          {
            role: UserRole.MECHANIC,
          },
        ),
      ).rejects.toThrow(
        'You cannot change your own role',
      );

      expect(
        usersRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should prevent assigning the administrator role', async () => {
      const targetUser =
        createTestUser({
          id: 'target-user',
        });

      usersRepository.findOne.mockResolvedValue(
        targetUser,
      );

      await expect(
        usersService.updateRole(
          targetUser.id,
          'admin-user',
          {
            role: UserRole.ADMIN,
          },
        ),
      ).rejects.toThrow(
        'Administrator role cannot be assigned through this endpoint',
      );

      expect(
        usersRepository.save,
      ).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should deactivate another user', async () => {
      const user =
        createTestUser({
          isActive: true,
        });

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      usersRepository.save.mockResolvedValue(
        {
          ...user,
          isActive: false,
        },
      );

      const result =
        await usersService.deactivate(
          user.id,
          'admin-user',
        );

      expect(result.isActive).toBe(false);
    });

    it('should prevent self-deactivation', async () => {
      const user =
        createTestUser();

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      await expect(
        usersService.deactivate(
          user.id,
          user.id,
        ),
      ).rejects.toThrow(
        'You cannot deactivate your own account',
      );

      expect(
        usersRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should reject deactivating an already inactive account', async () => {
      const user =
        createTestUser({
          isActive: false,
        });

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      await expect(
        usersService.deactivate(
          user.id,
          'admin-user',
        ),
      ).rejects.toThrow(
        'User account is already inactive',
      );
    });
  });

  describe('activate', () => {
    it('should activate an inactive user', async () => {
      const user =
        createTestUser({
          isActive: false,
        });

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      usersRepository.save.mockResolvedValue(
        {
          ...user,
          isActive: true,
        },
      );

      const result =
        await usersService.activate(
          user.id,
        );

      expect(result.isActive).toBe(true);
    });

    it('should reject activating an already active account', async () => {
      const user =
        createTestUser({
          isActive: true,
        });

      usersRepository.findOne.mockResolvedValue(
        user,
      );

      await expect(
        usersService.activate(
          user.id,
        ),
      ).rejects.toThrow(
        'User account is already active',
      );
    });
  });
});