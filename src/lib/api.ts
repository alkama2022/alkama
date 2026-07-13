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

type FetchOpts = RequestInit & { params?: Record<string, string | number | undefined | null> };

export async function api<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { params, headers, ...rest } = opts;

  // Build URL — API_URL is always absolute (http/https)
  let urlStr = API_URL + path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    if (q) urlStr += (urlStr.includes("?") ? "&" : "?") + q;
  }

  // Attach JWT Bearer token if present (browser only)
  let authHeader: Record<string, string> = {};
  try {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("apex.admin.token") : null;
    if (token) authHeader = { Authorization: `JWT ${token}` };
  } catch {
    /* ignore — SSR or storage blocked */
  }

  const res = await fetch(urlStr, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeader,
      ...(headers as Record<string, string> | undefined),
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
  brand: string;        // StringRelatedField — returns brand name
  category: string;     // StringRelatedField — returns category name
  model_name: string;
  width: number;
  aspect_ratio: number;
  rim_diameter: number;
  load_index: number;
  speed_rating: string;
  price: string;
  discount_price?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
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
