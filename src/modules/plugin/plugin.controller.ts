import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { CreatePluginDto } from './dto/create-plugin.dto';
import { UpdatePluginDto } from './dto/update-plugin.dto';

@Controller('myplugin/v1')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @Post()
  create(@Body() createPluginDto: CreatePluginDto) {
    return this.pluginService.create(createPluginDto);
  }

  @Post('payment-callback')
  handlePaymentCallback(@Req() req: Request) {
    // Your logic here, e.g.:
    console.log('Payment Callback Received:', req.body);
    return { status: 'success' };
  }

  @Get()
  findAll() {
    return this.pluginService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pluginService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePluginDto: UpdatePluginDto) {
    return this.pluginService.update(+id, updatePluginDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pluginService.remove(+id);
  }
}
