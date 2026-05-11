export class CreateOrderDto {
  address: string;
  paymentMethod: string;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
}
