import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'bytea', select: false })
  imageBlob: Buffer;

  @Column()
  imageMime: string;

  @Column()
  imageFilename: string;
}
