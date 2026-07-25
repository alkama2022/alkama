import { api, type Cart, type CartItem } from "./api";

const CART_KEY = "trx_cart_id";

export function getStoredCartId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CART_KEY);
}

export function setStoredCartId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, id);
}

export function clearStoredCartId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_KEY);
}

/**
 * Get or create the cart.
 * - If we have a stored UUID, try GET /cart/{uuid}/
 * - If that fails (404/500), clear it and create a new one via POST /cart/
 */
export async function ensureCart(): Promise<Cart> {
  const existing = getStoredCartId();
  if (existing) {
    try {
      return await api<Cart>(`/cart/${existing}/`);
    } catch {
      // Stale ID — clear and create fresh
      clearStoredCartId();
    }
  }
  const created = await api<Cart>(`/cart/`, { method: "POST" });
  setStoredCartId(String(created.id));
  return created;
}

/**
 * Add `quantity` of `productId` to the cart.
 */
export async function addToCart(productId: number, quantity: number): Promise<Cart> {
  const cart = await ensureCart();

  const existing = cart.items.find((i) => i.product.id === productId);

  if (existing) {
    await api<CartItem>(`/cart/${cart.id}/items/${existing.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: existing.quantity + quantity }),
    });
  } else {
    await api<CartItem>(`/cart/${cart.id}/items/`, {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  }

  return api<Cart>(`/cart/${cart.id}/`);
}
