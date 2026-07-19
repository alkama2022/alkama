import { useQuery } from "@tanstack/react-query";
import { api, type Paginated, type Product, type Brand, type Category, type Cart, type Review } from "@/lib/api";

export const queryKeys = {
  products: {
    all: ["products"] as const,
    list: (filters: Record<string, any>) => ["products", filters] as const,
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
  }
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

export function useCart(id: string | null) {
  return useQuery({
    queryKey: queryKeys.cart.detail(),
    queryFn: () => {
      if (!id) return Promise.reject(new Error("No cart ID"));
      return api<Cart>(`/cart/${id}/`);
    },
    enabled: !!id,
  });
}
