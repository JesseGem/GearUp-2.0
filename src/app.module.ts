import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoreModule } from './core/core.module.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { PartsModule } from './modules/parts/parts.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),
    CoreModule,
    DatabaseModule,
    UsersModule,
    AuthModule, // ← added
    VehiclesModule, // ← added
    PartsModule, // ← added
    JobsModule, // ← added
    PaymentsModule, // ← added
    ReviewsModule, // ← added
  ],
})
export class AppModule {}
