import { api, type Cart } from "./api";

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
  const created = await api<Cart>(`/cart/`, { method: "POST", body: JSON.stringify({}) });
  setStoredCartId(created.id);
  return created;
}
