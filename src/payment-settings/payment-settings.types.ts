import { PopularCriteria } from '../entities/payment-settings.entity';

export type PaymentSettingsResponse = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string | null;
  instructions: string | null;
  easypaisaNumber: string | null;
  jazzcashNumber: string | null;
  whatsappNumber: string | null;
  freeDeliveryEnabled: boolean;
  deliveryCharge: number;
  popularProductLimit: number;
  popularCriteria: PopularCriteria;
  featuredProductIds: string[];
};

export type PaymentSettingsInput = {
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string | null;
  instructions?: string | null;
  easypaisaNumber?: string | null;
  jazzcashNumber?: string | null;
  whatsappNumber?: string | null;
  freeDeliveryEnabled?: boolean;
  deliveryCharge?: number;
  popularProductLimit?: number;
  popularCriteria?: PopularCriteria | string;
  featuredProductIds?: string[];
  account_title?: string;
  account_number?: string;
  easypaisa_number?: string;
  jazzcash_number?: string;
  whatsapp_number?: string;
  free_delivery_enabled?: boolean;
  delivery_charge?: number;
  popular_product_limit?: number;
  popular_criteria?: PopularCriteria | string;
  featured_product_ids?: string[];
};
