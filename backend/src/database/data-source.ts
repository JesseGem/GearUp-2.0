import 'dotenv/config';

import { DataSource } from 'typeorm';

import { User } from '../modules/users/entities/user.entity.js';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity.js';
import { Part } from '../modules/parts/entities/part.entity.js';
import { Job } from '../modules/jobs/entities/job.entity.js';
import { Payment } from '../modules/payments/entities/payment.entity.js';
import { Review } from '../modules/reviews/entities/review.entity.js';

export default new DataSource({
  type: 'postgres',

  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'gearup',

  entities: [
    User,
    Vehicle,
    Part,
    Job,
    Payment,
    Review,
  ],

  migrations: [
    'dist/database/migrations/*.js',
  ],

  synchronize: false,
});