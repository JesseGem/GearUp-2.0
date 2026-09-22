import { PartialType } from '@nestjs/mapped-types';
import { CreatePartDto } from './create-part.dto.js';

export class UpdatePartDto extends PartialType(CreatePartDto) {}
