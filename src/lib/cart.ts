import { api, type Cart, type CartItem } from "./api";

// No cart ID needed — the backend manages the cart via session/cookie.
// We only store the cart ID locally to display the cart count in the header,
// but all operations go through the session on the server.

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
 * Get or create the cart. Always POST /cart/ — the server returns
 * the current session cart (or creates a new one).
 */
export async function ensureCart(): Promise<Cart> {
  const cart = await api<Cart>(`/cart/`, { method: "POST" });
  if (cart.id) setStoredCartId(String(cart.id));
  return cart;
}

/**
 * Add `quantity` of `productId` to the cart.
 */
export async function addToCart(productId: number, quantity: number): Promise<Cart> {
  const cart = await ensureCart();

  const existing = cart.items.find((i) => i.product.id === productId);

  if (existing) {
    await api<CartItem>(`/cart/items/${existing.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: existing.quantity + quantity }),
    });
  } else {
    await api<CartItem>(`/cart/items/`, {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  }

  // Return refreshed cart
  return api<Cart>(`/cart/`, { method: "POST" });
}
