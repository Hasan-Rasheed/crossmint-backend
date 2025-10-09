import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
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
  status: string; // 'pending', 'paid', 'failed'

  @Column({ default: 'pending' })
  crossmintStatus: string; // 'pending', 'received', 'processing'

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ nullable: true })
  customerWallet: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}
