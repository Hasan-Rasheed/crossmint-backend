import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { createHmac } from 'crypto';

@Injectable()
export class WooService {
  async createPayment(payload: any) {
    console.log('Received WooCommerce payload:', payload);

    // Example payload from Woo
    // {
    //   orderId: "123",
    //   amount: 2500,
    //   currency: "USD",
    //   returnUrl: "http://your-woo-site/checkout/order-received/123/...",
    //   metadata: { customer_email: "..." }
    // }

    // Simulate: if amount > 1000 → redirect, otherwise mark as paid
    if (payload.amount > 1000) {
      return {
        status: 'requires_action',
        redirectUrl: 'https://example.com/3ds-flow?orderId=' + payload.orderId,
      };
    }

    return {
      status: 'paid',
      transactionId: 'txn_' + Date.now(),
    };
  }

  async markOrderPaid(orderId: number, status: string) {
    console.clear();
    console.log('calling mark order paid', orderId)
    // console.log('env', process.env.WORDPRESS_USERNAME, process.env.WORDPRESS_PASSWORD)
    try {
    const orderPaid = await axios.put(
      `http://localhost:10003/wp-json/wc/v3/orders/${orderId}`,
      { status },
      {
        auth: {
          username: process.env.WORDPRESS_USERNAME || '',
          password: process.env.WORDPRESS_PASSWORD || '',
        },
      },
    );

    console.log('orderPaid', orderPaid)

    console.log(`Order ${orderId} marked as completed`);
    } catch(err) {
      console.error('Error marking order as paid:', err);
    }
 
 
      try {
    const ngrokMerchantShopUrl = 'http://localhost:10003'; // Replace with actual merchant shop URL
    const webhookUrl = `${ngrokMerchantShopUrl}/wp-json/my-custom-gateway/v1/payment-callback`;

    const res = await axios.post(webhookUrl, {
      order_id: orderId,
      status: status,
    }, {
      headers: {
        'Content-Type': 'application/json',
        // 'X-Plugin-Signature': createHmac('sha256', JSON.stringify({ order_id: orderId, status: status }), 'sharedSecret').digest('hex'), // optional
      },
    });

    console.log('Webhook response:', res.data);
  } catch (err) {
    console.error('Error calling merchant webhook:', err.message);
  }

  }

  processedOrders = new Set<number>();

  async processPaymentWebhook(orderId: number, status: string) {
    if (this.processedOrders.has(orderId)) {
      console.log(`Order ${orderId} already processed, skipping.`);
      return;
    }

    if (status === 'processing') {
      // Mark order as Paid in WooCommerce
      await this.markOrderPaid(orderId, 'completed');

      // Add to processed set
      this.processedOrders.add(orderId);
    }
  }
}
