import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from './users.entity';

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  orderNo: number;

  @ManyToOne(() => Users)
  @JoinColumn({ name: 'userId' })
  user: Users;

  @Column()
  address: string;

  @Column('json')
  items: unknown;

  @Column()
  paymentMethod: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  walletProvider: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReference: string | null;

  @Column({ type: 'bytea', nullable: true, select: false })
  paymentScreenshotBlob: Buffer | null;

  @Column({ type: 'varchar', nullable: true })
  paymentScreenshotMime: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentScreenshotFilename: string | null;

  @Column({ unique: true })
  receiptNumber: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  subtotalAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  deliveryCharge: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'cancellation_reason', type: 'varchar', nullable: true })
  cancellationReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
