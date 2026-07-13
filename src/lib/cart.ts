import { api, type Cart, type CartItem } from "./api";

const CART_KEY = "trx_cart_id";

export function getStoredCartId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CART_KEY);
}

export function setStoredCartId(id: string) {
  window.localStorage.setItem(CART_KEY, id);
}

export function clearStoredCartId() {
  window.localStorage.removeItem(CART_KEY);
}

export async function ensureCart(): Promise<Cart> {
  const existing = getStoredCartId();
  if (existing) {
    try {
      return await api<Cart>(`/cart/${existing}/`);
    } catch {
      clearStoredCartId();
    }
  }
  // Create a new cart — send empty body (Django expects POST with no required fields)
  const created = await api<Cart>(`/cart/`, { method: "POST" });
  setStoredCartId(created.id);
  return created;
}

/**
 * Add `quantity` of `productId` to the cart.
 * If the item already exists, increment its quantity rather than erroring.
 * Returns the updated Cart.
 */
export async function addToCart(productId: number, quantity: number): Promise<Cart> {
  const cart = await ensureCart();

  // Check if this product is already in the cart
  const existing = cart.items.find((i) => i.product.id === productId);

  if (existing) {
    // Increment quantity on the existing item
    await api<CartItem>(`/cart/${cart.id}/items/${existing.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: existing.quantity + quantity }),
    });
  } else {
    // Create a new cart item
    await api<CartItem>(`/cart/${cart.id}/items/`, {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  }

  // Return the refreshed cart so callers always get up-to-date data
  return api<Cart>(`/cart/${cart.id}/`);
}
