import { Injectable } from '@nestjs/common';
import axios from 'axios';

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

  async markOrderPaid(orderId: number) {
    await axios.put(
      `http://localhost:10003/wp-json/wc/v3/orders/${orderId}`,
      { status: 'completed' },
      {
        auth: { username: 'API_USER', password: 'API_PASSWORD' },
      },
    );

    console.log(`Order ${orderId} marked as completed`);
  }

  processedOrders = new Set<number>();

  async processPaymentWebhook(orderId: number, status: string) {
    if (this.processedOrders.has(orderId)) {
      console.log(`Order ${orderId} already processed, skipping.`);
      return;
    }

    if (status === 'processing') {
      // Mark order as Paid in WooCommerce
      await this.markOrderPaid(orderId);

      // Add to processed set
      this.processedOrders.add(orderId);
    }
  }
}
