import {
  describe,
  expect,
  beforeEach,
  it,
  vi,
} from 'vitest';

import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';

describe('AuthService', () => {
  let authService: AuthService;

  const usersRepository = {
    findOne: vi.fn(),
  };

  const jwtService = {
    signAsync: vi.fn(),
  };

  const testPassword = 'CorrectPassword123!';

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
      ...overrides,
    } as User;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    authService = new AuthService(
      usersRepository as never,
      jwtService as never,
    );
  });

  it('should reject login when email is missing', async () => {
    await expect(
      authService.login('', testPassword),
    ).rejects.toThrow(
      'Email and password are required',
    );

    expect(
      usersRepository.findOne,
    ).not.toHaveBeenCalled();

    expect(
      jwtService.signAsync,
    ).not.toHaveBeenCalled();
  });

  it('should reject login when password is missing', async () => {
    await expect(
      authService.login(
        'customer@example.com',
        '',
      ),
    ).rejects.toThrow(
      'Email and password are required',
    );

    expect(
      usersRepository.findOne,
    ).not.toHaveBeenCalled();

    expect(
      jwtService.signAsync,
    ).not.toHaveBeenCalled();
  });

  it('should reject login when the user does not exist', async () => {
    usersRepository.findOne.mockResolvedValue(
      null,
    );

    await expect(
      authService.login(
        'customer@example.com',
        testPassword,
      ),
    ).rejects.toThrow(
      'Invalid email or password',
    );

    expect(
      usersRepository.findOne,
    ).toHaveBeenCalledWith({
      where: {
        email: 'customer@example.com',
      },
    });

    expect(
      jwtService.signAsync,
    ).not.toHaveBeenCalled();
  });

  it('should reject login when the password is incorrect', async () => {
    const hashedPassword =
      await bcrypt.hash(
        testPassword,
        10,
      );

    const user = createTestUser({
      password: hashedPassword,
    });

    usersRepository.findOne.mockResolvedValue(
      user,
    );

    await expect(
      authService.login(
        'customer@example.com',
        'WrongPassword123!',
      ),
    ).rejects.toThrow(
      'Invalid email or password',
    );

    expect(
      usersRepository.findOne,
    ).toHaveBeenCalled();

    expect(
      jwtService.signAsync,
    ).not.toHaveBeenCalled();
  });

  it('should reject login when the account is inactive', async () => {
    const hashedPassword =
      await bcrypt.hash(
        testPassword,
        10,
      );

    const user = createTestUser({
      password: hashedPassword,
      isActive: false,
    });

    usersRepository.findOne.mockResolvedValue(
      user,
    );

    await expect(
      authService.login(
        'customer@example.com',
        testPassword,
      ),
    ).rejects.toThrow(
      'This account is inactive',
    );

    expect(
      jwtService.signAsync,
    ).not.toHaveBeenCalled();
  });

  it('should successfully login a valid active user', async () => {
    const hashedPassword =
      await bcrypt.hash(
        testPassword,
        10,
      );

    const user = createTestUser({
      password: hashedPassword,
      role: UserRole.CUSTOMER,
    });

    usersRepository.findOne.mockResolvedValue(
      user,
    );

    jwtService.signAsync.mockResolvedValue(
      'test-jwt-token',
    );

    const result =
      await authService.login(
        'customer@example.com',
        testPassword,
      );

    expect(result).toEqual({
      accessToken: 'test-jwt-token',
      user: {
        id: 'user-123',
        email: 'customer@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+233201234567',
        role: UserRole.CUSTOMER,
        isActive: true,
      },
    });

    expect(
      jwtService.signAsync,
    ).toHaveBeenCalledWith({
      userId: 'user-123',
      email: 'customer@example.com',
      role: UserRole.CUSTOMER,
    });
  });

  it('should never return the password in the login response', async () => {
    const hashedPassword =
      await bcrypt.hash(
        testPassword,
        10,
      );

    const user = createTestUser({
      password: hashedPassword,
    });

    usersRepository.findOne.mockResolvedValue(
      user,
    );

    jwtService.signAsync.mockResolvedValue(
      'test-jwt-token',
    );

    const result =
      await authService.login(
        'customer@example.com',
        testPassword,
      );

    expect(
      result.user,
    ).not.toHaveProperty(
      'password',
    );

    expect(
      JSON.stringify(result),
    ).not.toContain(
      hashedPassword,
    );
  });
});