import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'bytea' })
  imageBlob: Buffer;

  @Column()
  imageMime: string;

  @Column()
  imageFilename: string;
}
