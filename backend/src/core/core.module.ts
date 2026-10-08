import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { RolesGuard } from './guards/roles.guard.js';

@Global()
@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  providers: [RolesGuard],
  exports: [PassportModule, RolesGuard],
})
export class CoreModule {}
