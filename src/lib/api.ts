// ---------------------------------------------------------------------------
// API_URL resolution
//
// Priority:
//   1. VITE_API_URL  — set in .env (dev) or .env.production (prod)
//   2. Fallback to localhost for local dev convenience
//
// IMPORTANT for production:
//   Set VITE_API_URL=https://your-backend-domain.com/api in .env.production
//   before running `npm run build`.
// ---------------------------------------------------------------------------
export const API_URL: string =
  ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "") ||
  "http://localhost:8000/api";

export const WHATSAPP_NUMBER: string =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || "1234567890";

import { apiFetch } from "@/api/axios";

type FetchOpts = RequestInit & { params?: Record<string, string | number | undefined | null> };

export async function api<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { params, headers, body, method, ...rest } = opts;
  
  return apiFetch<T>(path, {
    method: method || "GET",
    params,
    headers,
    body,
    ...rest,
  });
}

// ---------------------------------------------------------------------------
// Types matching the Django serializers
// ---------------------------------------------------------------------------

export type ProductImage = {
  id: number;
  image: string; // may be a relative path like /media/store/images/foo.jpg
  is_primary: boolean;
};

/**
 * Resolve a media path to a full absolute URL.
 * Django returns image paths like "/media/store/images/foo.jpg".
 * We prepend the API origin so images load correctly in both dev and prod.
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Already absolute — return as-is
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
    return path;
  }
  // Strip /api suffix to get the Django origin (e.g. https://api.domain.com)
  const origin = API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

export type Product = {
  id: number;
  brand: string; // StringRelatedField — returns brand name
  brand_id: number;
  category: string; // StringRelatedField — returns category name
  category_id: number;
  model_name: string;
  tire_size: string; // e.g. "205/55 R16"
  load_index: number;
  speed_rating: string;
  price: string;
  description: string;
  inventory: number;
  is_active?: boolean;
  images: ProductImage[];
};

export type Brand = {
  id: number;
  name: string;
  slug?: string;
  logo?: string | null;
  products_count: number;
  created_at?: string;
};
export type Category = {
  id: number;
  name: string;
  slug?: string;
  products_count: number;
  created_at?: string;
};
export type Review = {
  id: number;
  name: string;
  description: string;
  date?: string;
  product?: number;
};

export type SimpleProduct = {
  id: number;
  model_name: string;
  price: string;
  brand?: string;
  tire_size?: string;
  image?: string;
  images?: ProductImage[];
};

export type CartItem = {
  id: number;
  product: SimpleProduct;
  quantity: number;
  total_price: string | number;
};

export type Cart = {
  id: string;
  items: CartItem[];
  total_price: string | number;
  created_at?: string;
};

export type Address = {
  id: number;
  customer?: number;
  street: string;
  city: string;
  zip?: string;
  country?: string;
};

export type Customer = {
  id: number;
  user?:
    | number
    | { id: number; first_name?: string; last_name?: string; email?: string; username?: string };
  phone_number?: string;
  birth_date?: string;
  membership?: string;
};

export type OrderItem = {
  id: number;
  product?: { id: number; model_name: string } | null;
  quantity: number;
  unit_price: string | number;
};

export type Order = {
  id: number;
  customer?: number | { id: number; first_name?: string; last_name?: string };
  payment_status?: string;
  placed_at?: string;
  items?: OrderItem[];
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type SentCartMessage = {
  id: number;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  contact_note?: string;
  items_snapshot: unknown;
  total_price: string | number;
  message_text: string;
  whatsapp_url: string;
  sent_via?: string;
  created_at: string;
  ip_address?: string;
};
