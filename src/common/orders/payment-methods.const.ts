export const ALLOWED_PAYMENT_METHODS = [
  'cash_on_delivery',
  'bank_transfer',
  'wallet',
  'credit_debit_card',
] as const;

export type PaymentMethod = (typeof ALLOWED_PAYMENT_METHODS)[number];
