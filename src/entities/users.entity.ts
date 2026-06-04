import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

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
}
