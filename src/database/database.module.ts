import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import databaseConfig from '../config/database.config.js';

import { User } from '../modules/users/entities/user.entity.js';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity.js';
import { Part } from '../modules/parts/entities/part.entity.js';
import { Job } from '../modules/jobs/entities/job.entity.js';
import { Payment } from '../modules/payments/entities/payment.entity.js';
import { Review } from '../modules/reviews/entities/review.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),

        entities: [
          User,
          Vehicle,
          Part,
          Job,
          Payment,
          Review,
        ],

        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
