import { buildApiResourceUrl } from '../http/api-url.util';
import { Category } from '../../entities/categories.entity';
import { Product } from '../../entities/product.entity';

export function toCategoryResponse(category: Category, baseUrl: string) {
  return {
    id: category.id,
    name: category.name,
    imageUrl: buildApiResourceUrl(baseUrl, `/categories/${category.id}/image`),
  };
}

export function toProductResponse(product: Product, baseUrl: string) {
  const discountPercent = Number(product.discount ?? 0);
  const categoryId = product.category?.id ?? null;

  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    discount: discountPercent,
    discountPercent,
    categoryId,
    imageUrl: buildApiResourceUrl(baseUrl, `/products/${product.id}/image`),
    category: product.category
      ? toCategoryResponse(product.category, baseUrl)
      : null,
  };
}
