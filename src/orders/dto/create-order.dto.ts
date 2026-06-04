export class CreateOrderDto {
  address: string;
  paymentMethod: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}
