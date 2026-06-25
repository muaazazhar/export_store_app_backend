import { Order } from '../../entities/order.entity';
import { Users } from '../../entities/users.entity';

export const ORDER_TYPE_CATALOG = 'catalog';
export const ORDER_TYPE_CUSTOM = 'custom';

export function normalizeOrderType(orderType?: string | null): string {
  return orderType === ORDER_TYPE_CUSTOM
    ? ORDER_TYPE_CUSTOM
    : ORDER_TYPE_CATALOG;
}

export function toOrderUserSnippet(user: Users | null | undefined) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phone: user.phone,
  };
}

export function toOrderCustomerNameFallbacks(user: Users | null | undefined) {
  const firstName = user?.firstName ?? null;
  const lastName = user?.lastName ?? null;

  return {
    customerFirstName: firstName,
    customerLastName: lastName,
    customer_first_name: firstName,
    customer_last_name: lastName,
  };
}

export function normalizeOrderAmounts(order: Order) {
  const subtotalAmount = Number(order.subtotalAmount);
  const deliveryCharge = Number(order.deliveryCharge);
  const totalAmount = Number(order.totalAmount);

  return {
    subtotalAmount,
    deliveryCharge,
    totalAmount,
    total: totalAmount,
  };
}

export function generateReceiptNumber(): string {
  return `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

type OrderItemRecord = Record<string, unknown>;

export function normalizeOrderItemsForResponse(
  items: unknown,
  orderType?: string | null,
) {
  if (!Array.isArray(items)) {
    return items;
  }

  const isCustomOrder = normalizeOrderType(orderType) === ORDER_TYPE_CUSTOM;

  return items.map((item) => {
    const raw = item as OrderItemRecord;
    const isCustom = raw.isCustom === true || isCustomOrder;

    if (isCustom) {
      const quantity = Number(raw.quantity ?? 1);
      const unitPrice = Number(raw.unitPrice ?? raw.price ?? 0);
      const lineTotal = Number(
        raw.lineTotal ?? unitPrice * quantity,
      );

      return {
        name: String(raw.name ?? ''),
        quantity,
        unitPrice,
        lineTotal,
        isCustom: true,
      };
    }

    const quantity = Number(raw.quantity ?? 0);
    const unitPrice = Number(raw.unitPrice ?? 0);
    const lineTotal = Number(raw.lineTotal ?? unitPrice * quantity);

    return {
      productId: raw.productId,
      name: raw.name,
      unitPrice,
      quantity,
      lineTotal,
    };
  });
}
