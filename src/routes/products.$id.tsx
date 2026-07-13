import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, mediaUrl, type Product, type Review, type ProductImage } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Tag,
  X,
  ZoomIn,
} from "lucide-react";

export const Route = createFileRoute("/products/$id")({
  component: ProductDetail,
  head: () => ({ meta: [{ title: "Product — Apex Tyres" }] }),
});

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  // Track total items added in this session for the sticky bar
  const [cartCount, setCartCount] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => api<Product>(`/products/${id}/`),
  });

  const reviews = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => api<Review[] | { results: Review[] }>(`/products/${id}/reviews/`),
  });

  const addToCartMutation = useMutation({
    mutationFn: () => addToCart(Number(id), qty),
    onSuccess: (cart) => {
      const total = cart.items.reduce((s, i) => s + i.quantity, 0);
      setCartCount(total);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
      window.dispatchEvent(new Event("cart:updated"));
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success(`${qty} × ${product.data?.model_name} added to cart`, {
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
  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (product.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-3">
            <div className="aspect-square animate-pulse rounded-lg bg-surface" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 w-16 animate-pulse rounded bg-surface" />
              ))}
            </div>
          </div>
          <div className="space-y-4 pt-4">
            <div className="h-5 w-1/4 animate-pulse rounded bg-surface" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-surface" />
            <div className="h-8 w-1/3 animate-pulse rounded bg-surface" />
            <div className="h-28 w-full animate-pulse rounded bg-surface" />
            <div className="h-12 w-full animate-pulse rounded bg-surface" />
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
  const reviewList: Review[] = Array.isArray(reviews.data)
    ? reviews.data
    : reviews.data?.results ?? [];

  const hasDiscount = p.discount_price != null && Number(p.discount_price) > 0 && Number(p.discount_price) < Number(p.price);
  const savings = hasDiscount
    ? (Number(p.price) - Number(p.discount_price!)).toFixed(2)
    : null;
  const displayPrice = hasDiscount ? p.discount_price! : p.price;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link
        to="/products"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="grid gap-12 md:grid-cols-2">
        {/* ── Left: Image Gallery ─────────────────────────────────────────── */}
        <ImageGallery images={images} productName={p.model_name} />

        {/* ── Right: Info + Add to Cart ───────────────────────────────────── */}
        <div className="flex flex-col">
          {/* Brand / Category breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className="text-primary">{p.brand}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-muted-foreground">{p.category}</span>
          </div>

          {/* Model name */}
          <h1 className="mt-2 font-display text-4xl uppercase leading-none sm:text-5xl">
            {p.model_name}
          </h1>

          {/* Price */}
          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-4xl text-primary">₦{displayPrice}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">₦{p.price}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                  <Tag className="h-3 w-3" /> Save ₦{savings}
                </span>
              </>
            )}
              <span className="ml-auto text-sm text-muted-foreground">per tyre</span>
          </div>

          {/* Stock badge */}
          <div className="mt-3">
            {p.inventory > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {p.inventory} in stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                Out of stock
              </span>
            )}
          </div>

          {/* Tyre specs grid */}
          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Tyre specifications
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Spec label="Width" value={`${p.width} mm`} />
              <Spec label="Aspect ratio" value={`${p.aspect_ratio}%`} />
              <Spec label="Rim diameter" value={`R${p.rim_diameter}"`} />
              <Spec label="Load index" value={`${p.load_index}`} />
              <Spec label="Speed rating" value={p.speed_rating} />
              <Spec
                label="Size"
                value={`${p.width}/${p.aspect_ratio} R${p.rim_diameter}`}
                highlight
              />
            </div>
          </div>

          {/* Description */}
          {p.description && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                About this tyre
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="mt-8 flex items-center gap-3">
            <div className="inline-flex items-center rounded-md border border-border bg-card">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="px-3 py-3 text-muted-foreground hover:text-primary disabled:opacity-30 transition"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-sm font-semibold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(p.inventory, q + 1))}
                disabled={qty >= p.inventory}
                className="px-3 py-3 text-muted-foreground hover:text-primary disabled:opacity-30 transition"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              disabled={p.inventory === 0 || addToCartMutation.isPending}
              onClick={() => addToCartMutation.mutate()}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold uppercase tracking-widest transition disabled:opacity-50 ${
                justAdded
                  ? "bg-green-600 text-white hover:brightness-110"
                  : "bg-primary text-primary-foreground hover:brightness-110"
              }`}
            >
              {justAdded ? (
                <><Check className="h-4 w-4" /> Added!</>
              ) : addToCartMutation.isPending ? (
                "Adding…"
              ) : p.inventory === 0 ? (
                "Out of stock"
              ) : (
                <><ShoppingCart className="h-4 w-4" /> Add to cart</>
              )}
            </button>
          </div>

          {/* Total for selection */}
          {p.inventory > 0 && qty > 1 && (
            <p className="mt-2 text-right text-sm text-muted-foreground">
              {qty} tyres ={" "}
              <span className="font-semibold text-primary">
                ${(Number(displayPrice) * qty).toFixed(2)}
              </span>
            </p>
          )}

          {/* View cart shortcut — appears after first add */}
          {cartCount > 0 && (
            <Link
              to="/cart"
              className="mt-4 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 transition hover:bg-primary/10"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShoppingCart className="h-4 w-4" />
                View cart
              </span>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                {cartCount} item{cartCount !== 1 ? "s" : ""}
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Reviews ─────────────────────────────────────────────────────────── */}
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

// ── Image Gallery ─────────────────────────────────────────────────────────────

function ImageGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const active = images[idx];
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  // Resolve every image URL once
  const resolved = images.map((im) => ({ ...im, image: mediaUrl(im.image) ?? im.image }));
  const activeResolved = resolved[idx];

  return (
    <>
      <div className="space-y-3">
        {/* Main image */}
        <div className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface">
          {activeResolved ? (
            <>
              <img
                src={activeResolved.image}
                alt={productName}
                className="h-full w-full object-cover"
              />
              {/* Zoom overlay */}
              <button
                onClick={() => setLightbox(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100"
                aria-label="View full size"
              >
                <ZoomIn className="h-10 w-10 text-white drop-shadow-lg" />
              </button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-2/3 w-2/3 rounded-full border-[24px] border-foreground/70" />
            </div>
          )}

          {/* Prev / Next arrows */}
          {resolved.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow transition hover:bg-background"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow transition hover:bg-background"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">
                {idx + 1} / {resolved.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {resolved.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {resolved.map((im, i) => (
              <button
                key={im.id}
                onClick={() => setIdx(i)}
                className={`aspect-square w-16 flex-shrink-0 overflow-hidden rounded border-2 transition ${
                  i === idx
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-primary/60"
                }`}
              >
                <img src={im.image} alt={`View ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* No images placeholder */}
        {images.length === 0 && (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-surface">
            <div className="h-2/3 w-2/3 rounded-full border-[24px] border-foreground/20" />
          </div>
        )}
      </div>

      {/* ── Lightbox ───────────────────────────────────────────────────────── */}
      {lightbox && activeResolved && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4"
          onClick={() => setLightbox(false)}
        >
          {/* Close */}
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Arrows */}
          {resolved.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          {/* Full-size image */}
          <img
            src={activeResolved.image}
            alt={productName}
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Dot indicators */}
          {resolved.length > 1 && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              {resolved.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                  className={`h-2 w-2 rounded-full transition ${
                    i === idx ? "bg-white" : "bg-white/35 hover:bg-white/65"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Thumbnail row in lightbox */}
          {resolved.length > 1 && (
            <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-2">
              {resolved.map((im, i) => (
                <button
                  key={im.id}
                  onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                  className={`aspect-square w-14 flex-shrink-0 overflow-hidden rounded border-2 transition ${
                    i === idx ? "border-white" : "border-white/30 hover:border-white/70"
                  }`}
                >
                  <img src={im.image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Spec tile ─────────────────────────────────────────────────────────────────

function Spec({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md p-2 ${highlight ? "bg-primary/10 ring-1 ring-primary/30" : "bg-background"}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 font-semibold ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
