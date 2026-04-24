export class CreateOrderDto {
  address: string;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
}
