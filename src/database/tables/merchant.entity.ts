import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Merchant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @ApiProperty({ example: 'CoffeeShopX', description: 'Name of the merchant business' })
  businessName: string;

  @Column()
  @ApiProperty({ example: 'info@coffeeshopx.com', description: 'Contact information of the merchant' })
  contactInformation: string;

  @Column()
  @ApiProperty({ example: '123 Coffee St, CoffeeTown, CA', description: 'Business address of the merchant' })
  businessAddress: string;
  
  @Column()
  @ApiProperty({ example: '0x123', description: 'Receiving address of the merchant' })
  receivingAddress: string;
}
