import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PartsController } from './parts.controller.js';
import { PartsService } from './parts.service.js';
import { Part } from './entities/part.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Part]),
  ],
  controllers: [PartsController],
  providers: [PartsService],
  exports: [PartsService],
})
export class PartsModule {}