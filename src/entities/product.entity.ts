import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from './categories.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('decimal')
  price: number;

  @Column({ type: 'bytea' })
  imageBlob: Buffer;

  @Column()
  imageMime: string;

  @Column()
  imageFilename: string;

  @ManyToOne(() => Category, { eager: true, nullable: false })
  category: Category;
}
