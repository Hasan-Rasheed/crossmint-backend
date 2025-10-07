import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Template } from './template.entity';

@Entity()
export class Merchant {
  @PrimaryGeneratedColumn()
  id: number;
 
  @Column()
  @ApiProperty({
    example: 'CoffeeShopX',
    description: 'Name of the merchant business',
  })
  businessName: string;

  @Column()
  @ApiProperty({
    example: 'info@coffeeshopx.com',
    description: 'Contact information of the merchant',
  })
  contactInformation: string;

  @Column()
  @ApiProperty({
    example: '123 Coffee St, CoffeeTown, CA',
    description: 'Business address of the merchant',
  })
  businessAddress: string;

  @Column()
  @ApiProperty({
    example: '0x123',
    description: 'Receiving address of the merchant',
  })
  receivingAddress: string;

  @Column({ nullable: true })
  @ApiProperty({
    example: '726.......',
    description: 'Hash of the image stored on IPFS'
  })
  imageIpfsHash: string;

  @Column({ nullable: true })
  @ApiProperty({
    example: '0xabc123...',
    description: 'Smart contract address for the merchant',
  })
  contractAddress?: string;

  @Column({ nullable: true })
  @ApiProperty({
    example: 'col_abc123...',
    description: 'Crossmint collection ID for the merchant',
  })
  collectionId?: string;

  @OneToMany(() => Template, (template) => template.merchant)
  templates: Template[];

  @Column({ nullable: true })
  @ApiProperty({
    example: 'https://coffeeshopx.com',
    description: 'Store URL',
  })
  storeUrl: string;
}
