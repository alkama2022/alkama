import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, mediaUrl, WHATSAPP_NUMBER, type Cart } from "@/lib/api";
import { clearStoredCartId, getStoredCartId } from "@/lib/cart";
import { useCart } from "@/hooks/queries";
import { Minus, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Your Cart — Khal Tyres Company Limited" }] }),
});

function CartPage() {
  const qc = useQueryClient();

  const cartId = getStoredCartId();
  const cart = useCart(cartId);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cart"] });
    window.dispatchEvent(new Event("cart:updated"));
  };

  const updateItem = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      const id = getStoredCartId()!;
      return api(`/cart/${id}/items/${itemId}/`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: number) => {
      const id = getStoredCartId()!;
      return api(`/cart/${id}/items/${itemId}/`, { method: "DELETE" });
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (cart.isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-16">Loading your cart…</div>;
  }

  const data = cart.data as Cart | undefined;
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl uppercase sm:text-5xl">
        Your <span className="text-primary">Cart</span>
      </h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link
            to="/products"
            className="mt-4 inline-block rounded-md bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                {/* Product image */}
                <Link
                  to="/products/$id"
                  params={{ id: String(it.product.id) }}
                  className="flex-shrink-0"
                >
                  {(() => {
                    const imgSrc = it.product.images?.[0]
                      ? (mediaUrl(it.product.images[0].image) ?? it.product.images[0].image)
                      : it.product.image
                        ? (mediaUrl(it.product.image) ?? it.product.image)
                        : null;
                    return imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={it.product.model_name}
                        className="h-20 w-20 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-md border border-border bg-surface">
                        <div className="h-12 w-12 rounded-full border-4 border-foreground/40" />
                      </div>
                    );
                  })()}
                </Link>
                <div className="flex-1">
                  <Link
                    to="/products/$id"
                    params={{ id: String(it.product.id) }}
                    className="font-display text-xl uppercase hover:text-primary"
                  >
                    {it.product.model_name}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {it.product.brand && <span>{it.product.brand} · </span>}
                    {it.product.tire_size && <span>{it.product.tire_size} · </span>}₦
                    {it.product.price} each
                  </div>
                </div>
                <div className="inline-flex items-center rounded-md border border-border">
                  <button
                    onClick={() =>
                      updateItem.mutate({ itemId: it.id, quantity: Math.max(1, it.quantity - 1) })
                    }
                    className="p-2 hover:text-primary"
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-semibold">{it.quantity}</span>
                  <button
                    onClick={() => updateItem.mutate({ itemId: it.id, quantity: it.quantity + 1 })}
                    className="p-2 hover:text-primary"
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="w-24 text-right font-display text-lg text-primary">
                  ₦{Number(it.total_price).toFixed(2)}
                </div>
                <button
                  onClick={() => removeItem.mutate(it.id)}
                  className="rounded-md p-2 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {data && (
            <CheckoutPanel
              cart={data}
              onDone={() => {
                clearStoredCartId();
                invalidate();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CheckoutPanel({ cart, onDone }: { cart: Cart; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "" });

  const submit = useMutation({
    mutationFn: async () => {
      const items_snapshot = cart.items.map((i) => ({
        product_id: i.product.id,
        model_name: i.product.model_name,
        brand: i.product.brand ?? "",
        tire_size: i.product.tire_size ?? "",
        price: i.product.price,
        quantity: i.quantity,
        line_total: Number(i.total_price),
      }));
      const total = Number(cart.total_price);
      const lines = cart.items
        .map((i) => {
          const brand = i.product.brand ? `${i.product.brand} ` : "";
          const size = i.product.tire_size ? ` (${i.product.tire_size})` : "";
          return `• ${brand}${i.product.model_name}${size} × ${i.quantity} — ₦${Number(i.total_price).toFixed(2)}`;
        })
        .join("\n");
      const message_text = [
        `New order request from ${form.name}`,
        `Phone: ${form.phone}`,
        form.email ? `Email: ${form.email}` : null,
        "",
        "Items:",
        lines,
        "",
        `Total: ₦${total.toFixed(2)}`,
        form.note ? `\nNote: ${form.note}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const whatsapp_url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message_text)}`;

      // Save the order record
      await api(`/messages/`, {
        method: "POST",
        body: JSON.stringify({
          contact_name: form.name,
          contact_phone: form.phone,
          contact_email: form.email,
          contact_note: form.note,
          items_snapshot,
          total_price: total,
          message_text,
          whatsapp_url,
          sent_via: "whatsapp",
        }),
      });

      // Open WhatsApp after the API call succeeds
      window.open(whatsapp_url, "_blank", "noopener");
      return true;
    },
    onSuccess: () => {
      toast.success("Order sent — check WhatsApp to confirm!");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = Number(cart.total_price).toFixed(2);
  const valid = form.name.trim() && form.phone.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) {
          toast.error("Please enter your name and phone.");
          return;
        }
        submit.mutate();
      }}
      className="h-fit rounded-lg border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Order total
        </div>
        <div className="font-display text-3xl text-primary">₦{total}</div>
      </div>

      <div className="space-y-3">
        <Field label="Full name *">
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="Phone *">
          <input
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="Note (optional)">
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>
      </div>

      <button
        disabled={submit.isPending}
        className="mt-5 w-full rounded-md bg-primary py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50"
      >
        {submit.isPending ? "Sending…" : "Send order via WhatsApp"}
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        We'll confirm stock and delivery on WhatsApp.
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}
