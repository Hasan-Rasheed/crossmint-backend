import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Merchant } from './merchant.entity';

@Entity()
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  crossmintTemplateId: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  image: string;

  @Column()
  symbol: string;

 @ManyToOne(() => Merchant, (merchant) => merchant.templates, { eager: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;
}
