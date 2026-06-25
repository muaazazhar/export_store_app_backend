import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const POPULAR_CRITERIA_VALUES = [
  'most_ordered',
  'highest_discount',
  'newest',
  'featured',
] as const;

export type PopularCriteria = (typeof POPULAR_CRITERIA_VALUES)[number];

@Entity('payment_settings')
export class PaymentSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  bankName: string;

  @Column({ default: '' })
  accountTitle: string;

  @Column({ default: '' })
  accountNumber: string;

  @Column({ type: 'varchar', nullable: true })
  iban: string | null;

  @Column({ type: 'varchar', nullable: true })
  instructions: string | null;

  @Column({ type: 'varchar', nullable: true })
  easypaisaNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  jazzcashNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  whatsappNumber: string | null;

  @Column({ default: false })
  freeDeliveryEnabled: boolean;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  deliveryCharge: number;

  @Column({ type: 'int', default: 12 })
  popularProductLimit: number;

  @Column({ type: 'varchar', length: 32, default: 'most_ordered' })
  popularCriteria: PopularCriteria;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  featuredProductIds: string[];

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
