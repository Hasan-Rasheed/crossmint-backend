import { Module } from '@nestjs/common';
import { CrossmintService } from './crossmint.service';
import { CrossmintController } from './crossmint.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [CrossmintController],
  providers: [CrossmintService],
  exports: [CrossmintService],
})
export class CrossmintModule {}
