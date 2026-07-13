import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, type Product, type Review, type ProductImage } from "@/lib/api";
import { ensureCart } from "@/lib/cart";
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, Star, X, ZoomIn } from "lucide-react";

export const Route = createFileRoute("/products/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => api<Product>(`/products/${id}/`),
  });

  const reviews = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => api<Review[] | { results: Review[] }>(`/products/${id}/reviews/`),
  });

  const addToCart = useMutation({
    mutationFn: async () => {
      const cart = await ensureCart();
      return api(`/cart/${cart.id}/items/`, {
        method: "POST",
        body: JSON.stringify({ product_id: Number(id), quantity: qty }),
      });
    },
    onSuccess: () => {
      window.dispatchEvent(new Event("cart:updated"));
      toast.success("Added to cart", {
        action: { label: "View cart", onClick: () => navigate({ to: "/cart" }) },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [reviewForm, setReviewForm] = useState({ name: "", description: "" });
  const addReview = useMutation({
    mutationFn: () =>
      api(`/products/${id}/reviews/`, {
        method: "POST",
        body: JSON.stringify(reviewForm),
      }),
    onSuccess: () => {
      setReviewForm({ name: "", description: "" });
      qc.invalidateQueries({ queryKey: ["reviews", id] });
      toast.success("Review posted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (product.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-lg bg-surface" />
          <div className="space-y-4">
            <div className="h-8 w-1/2 animate-pulse rounded bg-surface" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (product.isError || !product.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Link to="/products" className="mt-4 inline-block text-primary hover:underline">
          ← Back to shop
        </Link>
      </div>
    );
  }

  const p = product.data;
  const images = p.images ?? [];
  const active = images[imgIdx] || images[0];
  const reviewList: Review[] = Array.isArray(reviews.data)
    ? reviews.data
    : reviews.data?.results ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link
        to="/products"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface">
            {active ? (
              <img src={active.image} alt={p.model_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="h-2/3 w-2/3 rounded-full border-[24px] border-foreground/70" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((im, i) => (
                <button
                  key={im.id}
                  onClick={() => setImgIdx(i)}
                  className={`aspect-square overflow-hidden rounded border-2 ${
                    i === imgIdx ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={im.image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">
            {p.brand} · {p.category}
          </div>
          <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-5xl">
            {p.model_name}
          </h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-4xl text-primary">${p.price}</span>
            <span className="text-sm text-muted-foreground">per tyre</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-3">
            <Spec label="Width" value={`${p.width}mm`} />
            <Spec label="Aspect" value={`${p.aspect_ratio}`} />
            <Spec label="Rim" value={`R${p.rim_diameter}`} />
            <Spec label="Load" value={`${p.load_index}`} />
            <Spec label="Speed" value={p.speed_rating} />
            <Spec label="Stock" value={p.inventory > 0 ? `${p.inventory} in stock` : "Out of stock"} />
          </div>

          {p.description && (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {p.description}
            </p>
          )}

          <div className="mt-8 flex items-center gap-4">
            <div className="inline-flex items-center rounded-md border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-3 hover:text-primary"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="p-3 hover:text-primary"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              disabled={p.inventory === 0 || addToCart.isPending}
              onClick={() => addToCart.mutate()}
              className="flex-1 rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50 transition"
            >
              {addToCart.isPending ? "Adding…" : p.inventory === 0 ? "Out of stock" : "Add to cart"}
            </button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16 border-t border-border pt-10">
        <h2 className="font-display text-3xl uppercase">
          Customer <span className="text-primary">reviews</span>
        </h2>
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {reviewList.length === 0 && (
              <p className="text-sm text-muted-foreground">No reviews yet — be the first!</p>
            )}
            {reviewList.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <div className="font-semibold">{r.name}</div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reviewForm.name || !reviewForm.description) return;
              addReview.mutate();
            }}
            className="h-fit rounded-lg border border-border bg-card p-5"
          >
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Leave a review
            </div>
            <input
              value={reviewForm.name}
              onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <textarea
              value={reviewForm.description}
              onChange={(e) => setReviewForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Share your experience…"
              rows={4}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              disabled={addReview.isPending}
              className="mt-3 w-full rounded-md bg-primary py-2 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {addReview.isPending ? "Posting…" : "Post review"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}
