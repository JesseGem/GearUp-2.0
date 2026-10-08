import 'reflect-metadata';

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../modules/users/enums/user-role.enum.js';
import { RolesGuard } from './roles.guard.js';

class TestController {
  create() {}

  browse() {}
}

Roles(UserRole.MECHANIC, UserRole.ADMIN)(
  TestController.prototype,
  'create',
  Object.getOwnPropertyDescriptor(TestController.prototype, 'create')!,
);

function createExecutionContext(
  handler: () => void,
  role?: UserRole,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: role
          ? { userId: 'user-id', email: 'test@example.com', role }
          : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it.each([UserRole.MECHANIC, UserRole.ADMIN])(
    'allows %s for a restricted route',
    (role) => {
      expect(
        guard.canActivate(
          createExecutionContext(TestController.prototype.create, role),
        ),
      ).toBe(true);
    },
  );

  it('rejects customers for a mechanic/admin route', () => {
    expect(
      guard.canActivate(
        createExecutionContext(
          TestController.prototype.create,
          UserRole.CUSTOMER,
        ),
      ),
    ).toBe(false);
  });

  it('rejects a restricted route when the request has no user', () => {
    expect(
      guard.canActivate(
        createExecutionContext(TestController.prototype.create),
      ),
    ).toBe(false);
  });

  it('allows routes without role metadata', () => {
    expect(
      guard.canActivate(
        createExecutionContext(TestController.prototype.browse),
      ),
    ).toBe(true);
  });
});
