export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000/api";

export const WHATSAPP_NUMBER =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || "1234567890";

type FetchOpts = RequestInit & { params?: Record<string, string | number | undefined | null> };

export async function api<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { params, headers, ...rest } = opts;
  const url = new URL(API_URL + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  // Attach Django token auth if present. Read lazily to avoid circular import.
  let authHeader: Record<string, string> = {};
  try {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("apex.admin.token") : null;
    if (token) authHeader = { Authorization: `Token ${token}` };
  } catch {
    /* ignore */
  }
  const res = await fetch(url.toString().replace(window.location.origin, ""), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeader,
      ...(headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.text();
      if (body) msg += ` — ${body}`;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Types matching the Django serializers ---

export type ProductImage = { id: number; image: string; is_primary: boolean };

export type Product = {
  id: number;
  brand: string;
  category: string;
  model_name: string;
  width: number;
  aspect_ratio: number;
  rim_diameter: number;
  load_index: number;
  speed_rating: string;
  price: string;
  description: string;
  inventory: number;
  images: ProductImage[];
};

export type Brand = { id: number; name: string; products_count: number };
export type Category = { id: number; name: string; products_count: number };
export type Review = { id: number; name: string; description: string };

export type SimpleProduct = {
  id: number;
  model_name: string;
  price: string;
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
