export class CreateProductDto {
  name: string;
  price: number;
  categoryId: number;
  discount?: number;
}
