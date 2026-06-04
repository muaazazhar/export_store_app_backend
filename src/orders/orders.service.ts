import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isValidUuid } from '../common/validation/uuid.util';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { Users } from '../entities/users.entity';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { CreateOrderDto } from './dto/create-order.dto';
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

  private resolveWalletProvider(paymentMethod: string): string | null {
    if (paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') {
      return paymentMethod;
    }
    return null;
  }

  private toOrderResponse(order: Order) {
    const totalAmount = Number(order.totalAmount);
    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount,
      total: totalAmount,
      paymentMethod: order.paymentMethod,
      walletProvider: this.resolveWalletProvider(order.paymentMethod),
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

  async create(userId: string, dto: CreateOrderDto) {
    const address = dto.address?.trim();
    const paymentMethod = dto.paymentMethod?.trim().toLowerCase();
    if (!address) {
      throw new BadRequestException('Delivery address is required');
    }
    if (!paymentMethod) {
      throw new BadRequestException('Payment method is required');
    }
    const allowedPaymentMethods = [
      'cash_on_delivery',
      'card',
      'bank_transfer',
      'easypaisa',
      'jazzcash',
    ];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      throw new BadRequestException(
        'Payment method must be one of: cash_on_delivery, card, bank_transfer, easypaisa, jazzcash',
      );
    }

    const paymentSettings = await this.paymentSettingsService.getOrCreate();
    this.paymentSettingsService.assertPaymentMethodAllowed(
      paymentSettings,
      paymentMethod,
    );

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one order item is required');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const productIds = dto.items.map((item) => item.productId?.trim());
    for (const productId of productIds) {
      if (!productId || !isValidUuid(productId)) {
        throw new BadRequestException('Each item must have a valid productId');
      }
    }

    const products = productIds.length
      ? await this.productsRepository.find({
          where: { id: In(productIds) },
        })
      : [];

    const productsMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = dto.items.map((item) => {
      const productId = item.productId?.trim();
      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException('Each item must have quantity > 0');
      }

      const product = productsMap.get(productId);
      if (!product) {
        throw new NotFoundException(`Product ${productId} not found`);
      }

      return {
        productId: product.id,
        name: product.name,
        unitPrice: Number(product.price),
        quantity: item.quantity,
        lineTotal: Number(product.price) * item.quantity,
      };
    });
    const totalAmount = normalizedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );

    const order = this.ordersRepository.create({
      user,
      address,
      paymentMethod,
      items: normalizedItems,
      receiptNumber: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      totalAmount,
      status: 'pending',
      cancellationReason: null,
    });
    const saved = await this.ordersRepository.save(order);
    saved.user = user;
    return this.toOrderResponse(saved);
  }

  async findMine(userId: string) {
    const orders = await this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: { user: true },
      order: { orderNo: 'DESC' },
    });
    return orders.map((order) => this.toOrderResponse(order));
  }

  async findAll() {
    const orders = await this.ordersRepository.find({
      relations: { user: true },
      order: { orderNo: 'DESC' },
    });
    return orders.map((order) => this.toOrderResponse(order));
  }

  async updateOrder(id: string, dto: UpdateOrderStatusDto) {
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
    return this.toOrderResponse(saved);
  }

  async getReceipt(orderId: string, userId: string, role: string) {
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

    return {
      receiptNumber: order.receiptNumber,
      orderId: order.id,
      orderNo: order.orderNo,
      status: order.status,
      createdAt: order.createdAt,
      deliveryAddress: order.address,
      paymentMethod: order.paymentMethod,
      cancellationReason: order.cancellationReason ?? null,
      items: order.items,
      totalAmount: Number(order.totalAmount),
      total: Number(order.totalAmount),
      customer: {
        id: order.user.id,
        email: order.user.email,
      },
      customerEmail: order.user.email,
    };
  }
}
