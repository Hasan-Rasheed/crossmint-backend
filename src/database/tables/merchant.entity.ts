import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Merchant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  businessName: string;

  @Column()
  contactInformation: string;

  @Column()
  businessAddress: string;
  
  @Column()
  receivingAddress: string;
}
