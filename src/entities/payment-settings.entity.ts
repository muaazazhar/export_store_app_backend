import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
