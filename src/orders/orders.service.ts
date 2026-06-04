import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { buildApiResourceUrl } from '../common/http/api-url.util';
import { ALLOWED_PAYMENT_METHODS } from '../common/orders/payment-methods.const';
import { toPaymentScreenshotColumns } from '../common/upload/order-payment-upload.util';
import { UploadedImageFile } from '../common/upload/uploaded-file.type';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { Users } from '../entities/users.entity';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import {
  normalizePaymentMethod,
  parseCreateOrderBody,
} from './create-order-payload.util';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  CANCELLATION_REASON_MAX_LENGTH,
  getInvalidTransitionMessage,
  normalizeOrderStatus,
} from './order-status.util';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly paymentSettingsService: PaymentSettingsService,
  ) {}

  private buildPaymentScreenshotUrl(
    order: Order,
    baseUrl: string,
  ): string | null {
    if (!order.paymentScreenshotMime) {
      return null;
    }
    return buildApiResourceUrl(
      baseUrl,
      `/orders/${order.id}/payment-screenshot`,
    );
  }

  private discountedUnitPrice(product: Product): number {
    const price = Number(product.price);
    const discount = Number(product.discount ?? 0);
    return price * (1 - discount / 100);
  }

  private toOrderResponse(order: Order, baseUrl: string) {
    const subtotalAmount = Number(order.subtotalAmount);
    const deliveryCharge = Number(order.deliveryCharge);
    const totalAmount = Number(order.totalAmount);

    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      subtotalAmount,
      deliveryCharge,
      totalAmount,
      total: totalAmount,
      paymentMethod: order.paymentMethod,
      walletProvider: order.walletProvider,
      paymentReference: order.paymentReference,
      paymentScreenshotUrl: this.buildPaymentScreenshotUrl(order, baseUrl),
      address: order.address,
      cancellationReason: order.cancellationReason ?? null,
      items: order.items,
      receiptNumber: order.receiptNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user
        ? {
            id: order.user.id,
            email: order.user.email,
            username: order.user.username,
          }
        : null,
      customerEmail: order.user?.email ?? null,
    };
  }

  async create(
    userId: string,
    body: Record<string, unknown>,
    paymentScreenshot: UploadedImageFile | undefined,
    baseUrl: string,
  ) {
    const payload = parseCreateOrderBody(body);
    const normalized = normalizePaymentMethod(
      payload.paymentMethod,
      payload.walletProvider,
    );
    const paymentMethod = normalized.paymentMethod;
    const walletProvider = normalized.walletProvider;

    if (!(ALLOWED_PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
      throw new BadRequestException(
        'Payment method must be one of: cash_on_delivery, bank_transfer, wallet, credit_debit_card',
      );
    }

    const paymentSettings = await this.paymentSettingsService.getOrCreate();
    this.paymentSettingsService.assertPaymentMethodAllowed(
      paymentSettings,
      paymentMethod,
      walletProvider,
    );

    if (paymentMethod === 'bank_transfer') {
      const hasReference = Boolean(payload.paymentReference);
      const hasScreenshot = Boolean(paymentScreenshot);
      if (!hasReference && !hasScreenshot) {
        throw new BadRequestException(
          'paymentReference or paymentScreenshot is required for bank transfer',
        );
      }
    }

    if (payload.paymentReference && payload.paymentReference.length > 100) {
      throw new BadRequestException(
        'paymentReference must be at most 100 characters',
      );
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const productIds = payload.items.map((item) => item.productId);
    const products = await this.productsRepository.find({
      where: { id: In(productIds) },
    });
    const productsMap = new Map(products.map((product) => [product.id, product]));

    const normalizedItems = payload.items.map((item) => {
      const product = productsMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const unitPrice = this.discountedUnitPrice(product);
      return {
        productId: product.id,
        name: product.name,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const subtotalAmount = normalizedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );
    const deliveryCharge =
      this.paymentSettingsService.computeDeliveryCharge(paymentSettings);
    const totalAmount = subtotalAmount + deliveryCharge;

    const screenshotColumns = paymentScreenshot
      ? toPaymentScreenshotColumns(paymentScreenshot)
      : {
          paymentScreenshotBlob: null,
          paymentScreenshotMime: null,
          paymentScreenshotFilename: null,
        };

    const order = this.ordersRepository.create({
      user,
      address: payload.address,
      paymentMethod,
      walletProvider,
      paymentReference: payload.paymentReference,
      ...screenshotColumns,
      items: normalizedItems,
      receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      subtotalAmount,
      deliveryCharge,
      totalAmount,
      status: 'pending',
      cancellationReason: null,
    });
    const saved = await this.ordersRepository.save(order);
    saved.user = user;
    return this.toOrderResponse(saved, baseUrl);
  }

  async findMine(userId: string, baseUrl: string) {
    const orders = await this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: { user: true },
      order: { orderNo: 'DESC' },
    });
    return orders.map((order) => this.toOrderResponse(order, baseUrl));
  }

  async findAll(baseUrl: string) {
    const orders = await this.ordersRepository.find({
      relations: { user: true },
      order: { orderNo: 'DESC' },
    });
    return orders.map((order) => this.toOrderResponse(order, baseUrl));
  }

  async updateOrder(id: string, dto: UpdateOrderStatusDto, baseUrl: string) {
    const nextStatus = normalizeOrderStatus(dto.status ?? '');
    if (!nextStatus) {
      throw new BadRequestException(
        'Status must be one of: pending, processing, fulfilled, cancelled',
      );
    }

    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const transitionError = getInvalidTransitionMessage(order.status, nextStatus);
    if (transitionError) {
      throw new BadRequestException(transitionError);
    }

    if (nextStatus === 'cancelled') {
      const reason = dto.cancellationReason?.trim();
      if (!reason) {
        throw new BadRequestException(
          'cancellationReason is required when cancelling an order',
        );
      }
      if (reason.length > CANCELLATION_REASON_MAX_LENGTH) {
        throw new BadRequestException(
          `cancellationReason must be at most ${CANCELLATION_REASON_MAX_LENGTH} characters`,
        );
      }
      order.cancellationReason = reason;
    } else {
      order.cancellationReason = null;
    }

    order.status = nextStatus;
    const saved = await this.ordersRepository.save(order);
    return this.toOrderResponse(saved, baseUrl);
  }

  async getPaymentScreenshot(
    orderId: string,
    userId: string,
    role: string,
  ): Promise<{ buffer: Buffer; mime: string; filename: string }> {
    const order = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .addSelect('order.paymentScreenshotBlob')
      .where('order.id = :orderId', { orderId })
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isAdmin = role === 'admin';
    if (!isAdmin && order.user.id !== userId) {
      throw new ForbiddenException('You can only view your own payment proof');
    }

    if (!order.paymentScreenshotBlob || !order.paymentScreenshotMime) {
      throw new NotFoundException('Payment screenshot not found');
    }

    return {
      buffer: order.paymentScreenshotBlob,
      mime: order.paymentScreenshotMime,
      filename: order.paymentScreenshotFilename ?? 'payment-screenshot',
    };
  }

  async getReceipt(
    orderId: string,
    userId: string,
    role: string,
    baseUrl: string,
  ) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { user: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isAdmin = role === 'admin';
    if (!isAdmin && order.user.id !== userId) {
      throw new ForbiddenException('You can only view your own receipts');
    }

    const subtotalAmount = Number(order.subtotalAmount);
    const deliveryCharge = Number(order.deliveryCharge);
    const totalAmount = Number(order.totalAmount);

    return {
      receiptNumber: order.receiptNumber,
      orderId: order.id,
      orderNo: order.orderNo,
      status: order.status,
      createdAt: order.createdAt,
      deliveryAddress: order.address,
      paymentMethod: order.paymentMethod,
      walletProvider: order.walletProvider,
      paymentReference: order.paymentReference,
      paymentScreenshotUrl: this.buildPaymentScreenshotUrl(order, baseUrl),
      cancellationReason: order.cancellationReason ?? null,
      items: order.items,
      subtotalAmount,
      deliveryCharge,
      totalAmount,
      total: totalAmount,
      customer: {
        id: order.user.id,
        email: order.user.email,
      },
      customerEmail: order.user.email,
    };
  }
}
