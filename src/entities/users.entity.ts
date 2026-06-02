import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: 'user' }) // 'admin'
  role: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verificationTokenHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verificationTokenExpiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  verificationSentAt: Date | null;
}
