import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { Users } from '../entities/users.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async create(userId: number, dto: CreateOrderDto): Promise<Order> {
    const address = dto.address?.trim();
    const paymentMethod = dto.paymentMethod?.trim().toLowerCase();
    if (!address) {
      throw new BadRequestException('Delivery address is required');
    }
    if (!paymentMethod) {
      throw new BadRequestException('Payment method is required');
    }
    const allowedPaymentMethods = ['cash_on_delivery', 'card', 'bank_transfer'];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      throw new BadRequestException(
        'Payment method must be one of: cash_on_delivery, card, bank_transfer',
      );
    }
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one order item is required');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = productIds.length
      ? await this.productsRepository.find({
          where: { id: In(productIds) },
        })
      : [];

    const productsMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = dto.items.map((item) => {
      if (!item.productId || item.productId <= 0) {
        throw new BadRequestException('Each item must have a valid productId');
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException('Each item must have quantity > 0');
      }

      const product = productsMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
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
    });
    return this.ordersRepository.save(order);
  }

  findMine(userId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { user: { id: userId } },
      order: { id: 'DESC' },
    });
  }

  findAll(): Promise<Order[]> {
    return this.ordersRepository.find({ order: { id: 'DESC' } });
  }

  async updateStatus(id: number, status: string): Promise<Order> {
    const nextStatus = status?.trim().toLowerCase();
    const allowedStatuses = ['pending', 'processing', 'fulfilled', 'cancelled'];
    if (!nextStatus || !allowedStatuses.includes(nextStatus)) {
      throw new BadRequestException(
        'Status must be one of: pending, processing, fulfilled, cancelled',
      );
    }

    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = nextStatus;
    return this.ordersRepository.save(order);
  }

  async getReceipt(orderId: number, userId: number, role: string) {
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
      status: order.status,
      createdAt: order.createdAt,
      deliveryAddress: order.address,
      paymentMethod: order.paymentMethod,
      items: order.items,
      totalAmount: Number(order.totalAmount),
      customer: {
        id: order.user.id,
        email: order.user.email,
      },
    };
  }
}
