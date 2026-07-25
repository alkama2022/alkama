import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  api,
  type Paginated,
  type Product,
  type Brand,
  type Category,
  type Cart,
  type Review,
} from "@/lib/api";
import { clearStoredCartId, getStoredCartId } from "@/lib/cart";

export const queryKeys = {
  products: {
    all: ["products"] as const,
    list: (filters: Record<string, any>) => ["products", filters] as const,
    infinite: (filters: Record<string, any>) => ["products-infinite", filters] as const,
    featured: () => ["featured-products"] as const,
    detail: (id: string | number) => ["product", String(id)] as const,
    reviews: (id: string | number) => ["reviews", String(id)] as const,
  },
  brands: {
    all: ["brands"] as const,
  },
  categories: {
    all: ["cats"] as const,
  },
  cart: {
    detail: () => ["cart"] as const,
  },
  admin: {
    count: (resource: string) => ["admin-count", resource] as const,
  },
};

export function useProducts(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () =>
      api<Paginated<Product> | Product[]>(`/products/`, {
        params: filters,
      }),
  });
}

/**
 * Infinite-scroll version of useProducts.
 * Loads 12 products per page and appends on scroll.
 */
export function useInfiniteProducts(filters: Record<string, any> = {}) {
  // Strip page from filters — we manage it internally
  const { page: _page, page_size: _ps, ...baseFilters } = filters;

  return useInfiniteQuery({
    queryKey: queryKeys.products.infinite(baseFilters),
    queryFn: ({ pageParam = 1 }) =>
      api<Paginated<Product>>(`/products/`, {
        params: { ...baseFilters, page: pageParam, page_size: 12 },
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      // Extract page number from DRF's `next` URL
      try {
        const url = new URL(lastPage.next);
        const p = url.searchParams.get("page");
        return p ? Number(p) : undefined;
      } catch {
        return undefined;
      }
    },
  });
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => api<Paginated<Category> | Category[]>(`/productsCategories/`),
  });
}

export function useProductDetail(id: string | number) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => api<Product>(`/products/${id}/`),
  });
}

export function useProductReviews(id: string | number) {
  return useQuery({
    queryKey: queryKeys.products.reviews(id),
    queryFn: () => api<Review[] | { results: Review[] }>(`/products/${id}/reviews/`),
  });
}

export function useCart(_id?: string | null) {
  return useQuery({
    queryKey: queryKeys.cart.detail(),
    queryFn: async () => {
      const id = getStoredCartId();
      if (!id) return { id: "", items: [], total_price: 0 } as Cart;
      try {
        return await api<Cart>(`/cart/${id}/`);
      } catch {
        clearStoredCartId();
        return { id: "", items: [], total_price: 0 } as Cart;
      }
    },
    enabled: true,
  });
}
