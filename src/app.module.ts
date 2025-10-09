import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { AuthModule } from './modules/auth/auth.module';
import { CrossmintModule } from './modules/crossmint/crossmint.module';
import { CronModule } from './modules/cron/cron.module';
import { AdminModule } from './modules/admin/admin.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WooModule } from './modules/woo/woo.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PluginModule } from './modules/plugin/plugin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: process.env.DB_PASSWORD || 'root',
      database: 'crossmint',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    MerchantsModule,
    AuthModule,
    CrossmintModule,
    CronModule,
    WooModule,
    AdminModule,
    OrdersModule,
    PluginModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
