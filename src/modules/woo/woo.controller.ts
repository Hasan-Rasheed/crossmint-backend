import { Controller, Post, Body, Get, Res, HttpStatus, Param } from '@nestjs/common';
import { WooService } from './woo.service';
import axios from 'axios';
import { Response } from 'express';

@Controller('woo')
export class WooController {
  constructor(private readonly wooService: WooService) {}

  // This will match http://localhost:5000/woo/create
  @Post('create')
  async createPayment(@Body() payload: any) {
    // return this.wooService.createPayment(payload);
    // console.log('create payment', payload);
    return {
      status: 'paid',
      transactionId: 'TX_TEST_073',
      orderId: payload.orderId,
    };
  }

  @Get('single-order-details/:orderId')
  async getOrderDetails(@Param('orderId') orderId: string) {
    const response = await axios.get(
      `http://localhost:10003/wp-json/wc/v3/orders/${orderId}`,
      {
        auth: {
          username: process.env.WORDPRESS_USERNAME || '',
          password: process.env.WORDPRESS_PASSWORD || '',
        },
      },
    );

    return response.data;
  }

  @Get('all-orders-details')
  async getAllOrder(orderId: number) {
    const response = await axios.get(
      'http://localhost:10003/wp-json/wc/v3/orders',
      {
        auth: {  
          username: process.env.WORDPRESS_USERNAME || '',
          password: process.env.WORDPRESS_PASSWORD || '',
        },
      },
    );

    return response.data;
  }

  @Post('order-updated')
  async handleOrderUpdated(@Body() body: any, @Res() res: Response) {
    const { id: orderId, status } = body;

    console.log('WooCommerce webhook received:', orderId, status);
    console.log('================================')
    console.log('order updated api')

    const result = await this.wooService.processPaymentWebhook(orderId, status);
    // console.log('result', result)
    // return { received: true };
    return res.status(HttpStatus.OK).json({ received: true });

  }

  @Post('payment-success')
  async handlePaymentSuccess(@Body() body: { orderId: string, status: string }) {
    const { orderId, status } = body;

    console.clear();
    console.log('calling payment success api')
    console.log(`Payment success for Order ${orderId}`);

    try {
      const res = await axios.put(
        `http://localhost:10003/wp-json/wc/v3/orders/${orderId}`,
        {
          status,
          // transaction_id: transactionId,
        },
        {
          auth: {  
            username: process.env.WORDPRESS_USERNAME || '',
            password: process.env.WORDPRESS_PASSWORD || '',
          },
        },
      );

      // console.log('res', res);

      console.log('===================')
      return {
        status: 'success',
        message: 'Order marked as completed in WooCommerce',
      };
    } catch (error) {
      console.error(
        'Error updating WooCommerce order:',
        error.response?.data || error.message,
      );
      return {
        status: 'error',
        message: 'Failed to update order in WooCommerce',
      };
    }
  }
}




// nest start --watch --host 0.0.0.0 --port 5000
// ngrok http 5000
