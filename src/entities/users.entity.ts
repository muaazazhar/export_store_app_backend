import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'first_name', type: 'varchar', length: 50 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone: string | null;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  verificationTokenHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationTokenExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationSentAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  passwordResetCodeHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetCodeExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetSentAt: Date | null;

  @Column({ type: 'int', default: 0 })
  passwordResetAttempts: number;

  @Column({ type: 'varchar', nullable: true })
  passwordResetTokenHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetTokenExpiresAt: Date | null;
}
