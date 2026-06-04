const ALLOWED_STATUSES = ['pending', 'processing', 'fulfilled', 'cancelled'] as const;

export type OrderStatus = (typeof ALLOWED_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['processing', 'fulfilled', 'cancelled'],
  processing: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};

export const CANCELLATION_REASON_MAX_LENGTH = 500;

export function normalizeOrderStatus(status: string): OrderStatus | null {
  const normalized = status?.trim().toLowerCase() as OrderStatus;
  return ALLOWED_STATUSES.includes(normalized) ? normalized : null;
}

export function getInvalidTransitionMessage(
  currentStatus: string,
  nextStatus: OrderStatus,
): string | null {
  const current = normalizeOrderStatus(currentStatus);
  if (!current) {
    return 'Current order status is invalid';
  }

  if (ALLOWED_TRANSITIONS[current].includes(nextStatus)) {
    return null;
  }

  if (current === 'cancelled') {
    return 'Cannot change status of a cancelled order';
  }
  if (current === 'fulfilled') {
    return 'Cannot change status of a fulfilled order';
  }
  if (nextStatus === 'fulfilled') {
    return 'Cannot fulfill a cancelled order';
  }

  return `Cannot change order status from "${current}" to "${nextStatus}"`;
}
