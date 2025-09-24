import { PartialType } from '@nestjs/swagger';
import { CreateCrossmintDto } from './create-crossmint.dto';

export class UpdateCrossmintDto extends PartialType(CreateCrossmintDto) {}
