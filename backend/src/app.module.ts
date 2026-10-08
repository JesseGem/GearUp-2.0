import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CoreModule } from './core/core.module.js';
import { DatabaseModule } from './database/database.module.js';

import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { PartsModule } from './modules/parts/parts.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';

import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';

import { AuthThrottlerGuard } from './core/guards/auth-throttler.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    CoreModule,
    DatabaseModule,

    UsersModule,
    AuthModule,
    VehiclesModule,
    PartsModule,
    JobsModule,
    PaymentsModule,
    ReviewsModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthThrottlerGuard,
    },
  ],
})
export class AppModule {}