import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Merchant } from './merchant.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Merchant, merchant => merchant.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'crossmint_id', nullable: false })
  crossmintId: string;

  @Column({ name: 'woo_id', nullable: false })
  wooId: string;

  @Column({ name: 'store_url', nullable: false })
  storeUrl: string;

  @Column({ default: 'pending' })
  status: string;
}
