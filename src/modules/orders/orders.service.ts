import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/tables/order.entity';
import { Merchant } from '../../database/tables/merchant.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { merchantId, crossmintId, wooId, storeUrl, status, metadata } = createOrderDto;

    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');

    const order = this.orderRepository.create({
      merchant,
      crossmintId,
      wooId,
      storeUrl,
      status,
      metadata,
    });

    return await this.orderRepository.save(order);
  }

  async findByCrossmintId(crossmintId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { crossmintId },
      relations: ['merchant'],
    });

    if (!order) {
      throw new NotFoundException(`Order with Crossmint ID ${crossmintId} not found`);
    }

    return order;
  }

   async updateStatusByWooId(wooId: string, status: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { wooId },
    });

    if (!order) {
      throw new NotFoundException(`Order with Woo ID ${wooId} not found`);
    }

    // Update the status
    order.status = status;
    order.crossmintStatus = status;

    // Save the updated order
    return await this.orderRepository.save(order);
  }
} 
