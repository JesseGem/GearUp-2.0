import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { Job } from './entities/job.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
