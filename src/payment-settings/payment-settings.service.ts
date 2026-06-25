import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  pickBoolean,
  pickFiniteNumber,
  pickNullableString,
  pickTrimmedString,
} from '../common/dto/field-normalize.util';
import { isValidUuid } from '../common/validation/uuid.util';
import {
  PaymentSettings,
  POPULAR_CRITERIA_VALUES,
  PopularCriteria,
} from '../entities/payment-settings.entity';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import {
  PaymentSettingsInput,
  PaymentSettingsResponse,
} from './payment-settings.types';

@Injectable()
export class PaymentSettingsService {
  constructor(
    @InjectRepository(PaymentSettings)
    private readonly settingsRepository: Repository<PaymentSettings>,
  ) {}

  private toResponse(settings: PaymentSettings): PaymentSettingsResponse {
    return {
      bankName: settings.bankName ?? '',
      accountTitle: settings.accountTitle ?? '',
      accountNumber: settings.accountNumber ?? '',
      iban: settings.iban,
      instructions: settings.instructions,
      easypaisaNumber: settings.easypaisaNumber,
      jazzcashNumber: settings.jazzcashNumber,
      whatsappNumber: settings.whatsappNumber,
      freeDeliveryEnabled: settings.freeDeliveryEnabled,
      deliveryCharge: Number(settings.deliveryCharge ?? 0),
      popularProductLimit: settings.popularProductLimit,
      popularCriteria: settings.popularCriteria,
      featuredProductIds: settings.featuredProductIds ?? [],
    };
  }

  getPopularProductLimit(settings: PaymentSettings): number {
    return Math.min(50, Math.max(1, Number(settings.popularProductLimit ?? 12)));
  }

  computeDeliveryCharge(settings: PaymentSettings): number {
    if (settings.freeDeliveryEnabled) {
      return 0;
    }
    return Number(settings.deliveryCharge ?? 0);
  }

  isBankTransferConfigured(settings: PaymentSettings): boolean {
    return Boolean(
      settings.bankName?.trim() &&
        settings.accountTitle?.trim() &&
        settings.accountNumber?.trim(),
    );
  }

  isEasypaisaConfigured(settings: PaymentSettings): boolean {
    return Boolean(settings.easypaisaNumber?.trim());
  }

  isJazzcashConfigured(settings: PaymentSettings): boolean {
    return Boolean(settings.jazzcashNumber?.trim());
  }

  private normalizeInput(
    dto: PaymentSettingsInput,
  ): Partial<PaymentSettingsResponse> {
    const pickCriteria = (
      value: string | undefined,
    ): PopularCriteria | undefined => {
      if (value === undefined) {
        return undefined;
      }
      const normalized = value.trim() as PopularCriteria;
      return POPULAR_CRITERIA_VALUES.includes(normalized)
        ? normalized
        : undefined;
    };

    const pickFeaturedIds = (
      value: string[] | undefined,
    ): string[] | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (!Array.isArray(value)) {
        return [];
      }
      return value
        .map((id) => String(id).trim())
        .filter((id) => isValidUuid(id));
    };

    return {
      bankName: pickTrimmedString(dto.bankName),
      accountTitle: pickTrimmedString(dto.accountTitle ?? dto.account_title),
      accountNumber: pickTrimmedString(dto.accountNumber ?? dto.account_number),
      iban: pickNullableString(dto.iban),
      instructions: pickNullableString(dto.instructions),
      easypaisaNumber: pickNullableString(
        dto.easypaisaNumber ?? dto.easypaisa_number,
      ),
      jazzcashNumber: pickNullableString(
        dto.jazzcashNumber ?? dto.jazzcash_number,
      ),
      whatsappNumber: pickNullableString(
        dto.whatsappNumber ?? dto.whatsapp_number,
      ),
      freeDeliveryEnabled: pickBoolean(
        dto.freeDeliveryEnabled ?? dto.free_delivery_enabled,
      ),
      deliveryCharge: pickFiniteNumber(
        dto.deliveryCharge ?? dto.delivery_charge,
      ),
      popularProductLimit: pickFiniteNumber(
        dto.popularProductLimit ?? dto.popular_product_limit,
      ),
      popularCriteria: pickCriteria(
        (dto.popularCriteria ?? dto.popular_criteria) as string | undefined,
      ),
      featuredProductIds: pickFeaturedIds(
        dto.featuredProductIds ?? dto.featured_product_ids,
      ),
    };
  }

  async getOrCreate(): Promise<PaymentSettings> {
    const rows = await this.settingsRepository.find({ take: 1 });
    if (rows.length > 0) {
      return rows[0];
    }

    return this.settingsRepository.save(
      this.settingsRepository.create({
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        iban: null,
        instructions: null,
        easypaisaNumber: null,
        jazzcashNumber: null,
        whatsappNumber: null,
        freeDeliveryEnabled: false,
        deliveryCharge: 0,
        popularProductLimit: 12,
        popularCriteria: 'most_ordered',
        featuredProductIds: [],
      }),
    );
  }

  async getSettings(): Promise<PaymentSettingsResponse> {
    return this.toResponse(await this.getOrCreate());
  }

  assertPaymentMethodAllowed(
    settings: PaymentSettings,
    paymentMethod: string,
    walletProvider: string | null,
  ): void {
    if (paymentMethod === 'bank_transfer' && !this.isBankTransferConfigured(settings)) {
      throw new BadRequestException('Bank transfer is not available');
    }

    if (paymentMethod === 'wallet') {
      if (!walletProvider) {
        throw new BadRequestException('walletProvider is required for wallet payments');
      }
      if (walletProvider === 'easypaisa' && !this.isEasypaisaConfigured(settings)) {
        throw new BadRequestException('Easypaisa is not available');
      }
      if (walletProvider === 'jazzcash' && !this.isJazzcashConfigured(settings)) {
        throw new BadRequestException('JazzCash is not available');
      }
      if (!['easypaisa', 'jazzcash'].includes(walletProvider)) {
        throw new BadRequestException(
          'walletProvider must be easypaisa or jazzcash',
        );
      }
    }
  }

  private validateSettings(values: PaymentSettingsResponse): void {
    if (!values.freeDeliveryEnabled && values.deliveryCharge <= 0) {
      throw new BadRequestException(
        'deliveryCharge must be greater than zero when free delivery is disabled',
      );
    }

    if (values.popularProductLimit < 1 || values.popularProductLimit > 50) {
      throw new BadRequestException(
        'popularProductLimit must be between 1 and 50',
      );
    }

    if (!POPULAR_CRITERIA_VALUES.includes(values.popularCriteria)) {
      throw new BadRequestException(
        `popularCriteria must be one of: ${POPULAR_CRITERIA_VALUES.join(', ')}`,
      );
    }
  }

  private normalizeForPut(dto: PaymentSettingsInput): PaymentSettingsResponse {
    const partial = this.normalizeInput(dto);
    const values: PaymentSettingsResponse = {
      bankName: partial.bankName ?? '',
      accountTitle: partial.accountTitle ?? '',
      accountNumber: partial.accountNumber ?? '',
      iban: partial.iban ?? null,
      instructions: partial.instructions ?? null,
      easypaisaNumber: partial.easypaisaNumber ?? null,
      jazzcashNumber: partial.jazzcashNumber ?? null,
      whatsappNumber: partial.whatsappNumber ?? null,
      freeDeliveryEnabled: partial.freeDeliveryEnabled ?? false,
      deliveryCharge: partial.deliveryCharge ?? 0,
      popularProductLimit: partial.popularProductLimit ?? 12,
      popularCriteria: partial.popularCriteria ?? 'most_ordered',
      featuredProductIds: partial.featuredProductIds ?? [],
    };
    values.popularProductLimit = Math.min(
      50,
      Math.max(1, values.popularProductLimit),
    );
    this.validateSettings(values);
    return values;
  }

  async updateSettings(
    dto: UpdatePaymentSettingsDto,
  ): Promise<PaymentSettingsResponse> {
    const settings = await this.getOrCreate();
    const values = this.normalizeForPut(dto);

    Object.assign(settings, values);
    return this.toResponse(await this.settingsRepository.save(settings));
  }
}
