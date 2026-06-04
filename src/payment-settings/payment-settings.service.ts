import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentSettings } from '../entities/payment-settings.entity';
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
      freeDeliveryEnabled: settings.freeDeliveryEnabled,
      deliveryCharge: Number(settings.deliveryCharge ?? 0),
    };
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
    const pickString = (value: string | undefined): string | undefined => {
      if (value === undefined) {
        return undefined;
      }
      return value.trim();
    };

    const pickNullable = (
      value: string | null | undefined,
    ): string | null | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed || null;
    };

    const pickBoolean = (value: boolean | undefined): boolean | undefined => {
      if (value === undefined) {
        return undefined;
      }
      return Boolean(value);
    };

    const pickNumber = (value: number | undefined): number | undefined => {
      if (value === undefined) {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    return {
      bankName: pickString(dto.bankName),
      accountTitle: pickString(dto.accountTitle ?? dto.account_title),
      accountNumber: pickString(dto.accountNumber ?? dto.account_number),
      iban: pickNullable(dto.iban),
      instructions: pickNullable(dto.instructions),
      easypaisaNumber: pickNullable(
        dto.easypaisaNumber ?? dto.easypaisa_number,
      ),
      jazzcashNumber: pickNullable(dto.jazzcashNumber ?? dto.jazzcash_number),
      freeDeliveryEnabled: pickBoolean(
        dto.freeDeliveryEnabled ?? dto.free_delivery_enabled,
      ),
      deliveryCharge: pickNumber(dto.deliveryCharge ?? dto.delivery_charge),
    };
  }

  async getOrCreate(): Promise<PaymentSettings> {
    const rows = await this.settingsRepository.find({ take: 1 });
    if (rows.length > 0) {
      return rows[0];
    }

    const created = this.settingsRepository.create({
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      iban: null,
      instructions: null,
      easypaisaNumber: null,
      jazzcashNumber: null,
      freeDeliveryEnabled: false,
      deliveryCharge: 0,
    });
    return this.settingsRepository.save(created);
  }

  async getSettings(): Promise<PaymentSettingsResponse> {
    const settings = await this.getOrCreate();
    return this.toResponse(settings);
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

  private validateDeliverySettings(values: PaymentSettingsResponse): void {
    if (!values.freeDeliveryEnabled && values.deliveryCharge <= 0) {
      throw new BadRequestException(
        'deliveryCharge must be greater than zero when free delivery is disabled',
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
      freeDeliveryEnabled: partial.freeDeliveryEnabled ?? false,
      deliveryCharge: partial.deliveryCharge ?? 0,
    };
    this.validateDeliverySettings(values);
    return values;
  }

  async updateSettings(
    dto: UpdatePaymentSettingsDto,
  ): Promise<PaymentSettingsResponse> {
    const settings = await this.getOrCreate();
    const values = this.normalizeForPut(dto);

    settings.bankName = values.bankName;
    settings.accountTitle = values.accountTitle;
    settings.accountNumber = values.accountNumber;
    settings.iban = values.iban;
    settings.instructions = values.instructions;
    settings.easypaisaNumber = values.easypaisaNumber;
    settings.jazzcashNumber = values.jazzcashNumber;
    settings.freeDeliveryEnabled = values.freeDeliveryEnabled;
    settings.deliveryCharge = values.deliveryCharge;

    const saved = await this.settingsRepository.save(settings);
    return this.toResponse(saved);
  }
}
