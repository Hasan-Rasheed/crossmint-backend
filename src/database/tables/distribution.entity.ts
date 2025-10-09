import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Merchant } from './merchant.entity';

@Entity('distributions')
export class Distribution {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  merchantId: number;

  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  merchantAmount: number; // 90% of total

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  platformFees: number; // 10% of total

  @Column()
  transactionHash: string;

  @Column({ default: 'completed' })
  status: string; // 'completed', 'pending', 'failed'

  @CreateDateColumn()
  distributedAt: Date;

  @Column({ nullable: true })
  notes: string;
}

