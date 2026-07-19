import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, mediaUrl, type Product, type ProductImage, type Review } from "@/lib/api";
import { useProductDetail, useProductReviews, queryKeys } from "@/hooks/queries";
import { addToCart } from "@/lib/cart";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  X,
  ZoomIn,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Props {
  productId: number | null;
  onClose: () => void;
}

export function ProductDetailDrawer({ productId, onClose }: Props) {
  const open = productId !== null;

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ── Top bar — matches the site header style ── */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur sm:px-6">
        {/* Logo / brand — same as Header */}
        <Link to="/" onClick={onClose} className="flex items-center gap-2">
          <span className="inline-block h-8 w-8 rounded-full border-2 border-primary bg-background" />
          <span className="font-display text-2xl tracking-wide">
            KHAL<span className="text-primary"> </span>TYRES
          </span>
        </Link>

        {/* Nav links — same as Header */}
        <nav className="hidden items-center gap-8 md:flex">
          {[
            { to: "/", label: "Home" },
            { to: "/products", label: "Shop" },
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
            { to: "/admin", label: "Admin" },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className="text-sm font-semibold uppercase tracking-wider text-foreground/80 hover:text-primary transition"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Close button */}
        <button
          onClick={onClose}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <DrawerContent productId={productId!} onClose={onClose} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function drawerSpeedLabel(rating: string): string {
  const map: Record<string, string> = {
    N: "140 km/h",
    P: "150 km/h",
    Q: "160 km/h",
    R: "170 km/h",
    S: "180 km/h",
    T: "190 km/h",
    U: "200 km/h",
    H: "210 km/h",
    V: "240 km/h",
    W: "270 km/h",
    Y: "300 km/h",
    Z: "240+ km/h",
    ZR: "240+ km/h",
  };
  return map[rating.toUpperCase()] ?? "";
}

function DrawerContent({ productId, onClose }: { productId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const product = useProductDetail(productId);
  const reviews = useProductReviews(productId);

  const addMutation = useMutation({
    mutationFn: () => addToCart(productId, qty),
    onSuccess: (cart) => {
      const total = cart.items.reduce((s, i) => s + i.quantity, 0);
      setCartCount(total);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
      window.dispatchEvent(new Event("cart:updated"));
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success(`${qty} × ${product.data?.model_name} added to cart`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [reviewForm, setReviewForm] = useState({ name: "", description: "" });
  const addReview = useMutation({
    mutationFn: () =>
      api(`/products/${productId}/reviews/`, {
        method: "POST",
        body: JSON.stringify(reviewForm),
      }),
    onSuccess: () => {
      setReviewForm({ name: "", description: "" });
      qc.invalidateQueries({ queryKey: queryKeys.products.reviews(productId) });
      toast.success("Review posted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (product.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
        <div className="space-y-3">
          <div className="h-64 animate-pulse rounded-lg bg-surface sm:h-80 lg:h-96" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 w-14 animate-pulse rounded bg-surface" />
            ))}
          </div>
        </div>
        <div className="mt-6 space-y-4 lg:mt-0">
          <div className="h-4 w-1/4 animate-pulse rounded bg-surface" />
          <div className="h-8 w-2/3 animate-pulse rounded bg-surface" />
          <div className="h-8 w-1/3 animate-pulse rounded bg-surface" />
          <div className="h-24 w-full animate-pulse rounded bg-surface" />
          <div className="h-12 w-full animate-pulse rounded bg-surface" />
        </div>
      </div>
    );
  }

  if (product.isError || !product.data) {
    return <div className="p-8 text-center text-muted-foreground">Failed to load product.</div>;
  }

  const p = product.data;
  const images = p.images ?? [];
  const reviewList: Review[] = Array.isArray(reviews.data)
    ? reviews.data
    : ((reviews.data as { results: Review[] } | undefined)?.results ?? []);

  const displayPrice = p.price;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
      {/* ── Left: image gallery ── */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <DrawerGallery images={images} productName={p.model_name} />
      </div>

      {/* ── Right: product info ── */}
      <div className="mt-6 flex flex-col lg:mt-0">
        {/* Brand / category */}
        <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
          <span className="text-primary">{p.brand}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground">{p.category}</span>
        </div>

        {/* Model name */}
        <h2 className="mt-1 font-display text-3xl uppercase leading-none">{p.model_name}</h2>

        {/* Price */}
        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <span className="font-display text-3xl text-primary">₦{p.price}</span>
          <span className="ml-auto text-sm text-muted-foreground">per tyre</span>
        </div>

        {/* Specs */}
        <div className="mt-5 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Tyre specifications
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <SpecTile label="Tyre size" value={p.tire_size} highlight />
            <SpecTile label="Load index" value={`${p.load_index} kg`} />
            <SpecTile label="Speed rating" value={`${p.speed_rating} — ${drawerSpeedLabel(p.speed_rating)}`} />
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <div className="mt-5">
            <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              About this tyre
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {p.description}
            </p>
          </div>
        )}

        {/* Qty + Add to cart */}
        <div className="mt-6 flex items-center gap-3">
          <div className="inline-flex items-center rounded-md border border-border bg-card">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="px-3 py-3 text-muted-foreground hover:text-primary disabled:opacity-30 transition"
              aria-label="Decrease"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-semibold">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(p.inventory, q + 1))}
              disabled={qty >= p.inventory}
              className="px-3 py-3 text-muted-foreground hover:text-primary disabled:opacity-30 transition"
              aria-label="Increase"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            disabled={p.inventory === 0 || addMutation.isPending}
            onClick={() => addMutation.mutate()}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold uppercase tracking-widest transition disabled:opacity-50 ${
              justAdded
                ? "bg-green-600 text-white"
                : "bg-primary text-primary-foreground hover:brightness-110"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4" /> Added!
              </>
            ) : addMutation.isPending ? (
              "Adding…"
            ) : p.inventory === 0 ? (
              "Out of stock"
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" /> Add to cart
              </>
            )}
          </button>
        </div>

        {/* Total for selection */}
        {p.inventory > 0 && qty > 1 && (
          <p className="mt-2 text-right text-sm text-muted-foreground">
            {qty} tyres ={" "}
            <span className="font-semibold text-primary">
              ₦{(Number(p.price) * qty).toFixed(2)}
            </span>
          </p>
        )}

        {/* Go to cart shortcut */}
        {cartCount > 0 && (
          <Link
            to="/cart"
            onClick={onClose}
            className="mt-4 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 transition hover:bg-primary/10"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShoppingCart className="h-4 w-4" /> View cart
            </span>
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
              {cartCount} item{cartCount !== 1 ? "s" : ""}
            </span>
          </Link>
        )}

        {/* ── Reviews ──────────────────────────────────────────────────────── */}
        <div className="mt-10 border-t border-border pt-8">
          <h3 className="font-display text-2xl uppercase">
            Customer <span className="text-primary">reviews</span>
          </h3>

          {/* Review list */}
          <div className="mt-4 space-y-3">
            {reviews.isLoading && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-surface" />
                ))}
              </div>
            )}
            {!reviews.isLoading && reviewList.length === 0 && (
              <p className="text-sm text-muted-foreground">No reviews yet — be the first!</p>
            )}
            {reviewList.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="font-semibold">{r.name}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>

          {/* Add review form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reviewForm.name || !reviewForm.description) return;
              addReview.mutate();
            }}
            className="mt-6 rounded-lg border border-border bg-card p-5"
          >
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Leave a review
            </div>
            <input
              value={reviewForm.name}
              onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <textarea
              value={reviewForm.description}
              onChange={(e) => setReviewForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Share your experience…"
              rows={3}
              required
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={addReview.isPending}
              className="mt-3 w-full rounded-md bg-primary py-2 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {addReview.isPending ? "Posting…" : "Post review"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawer image gallery (horizontal scroll thumbnails + lightbox)
// ---------------------------------------------------------------------------

function DrawerGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const resolved = images.map((im) => ({ ...im, image: mediaUrl(im.image) ?? im.image }));
  const active = resolved[idx];

  const prev = () => setIdx((i) => (i - 1 + resolved.length) % resolved.length);
  const next = () => setIdx((i) => (i + 1) % resolved.length);

  return (
    <>
      <div className="space-y-2">
        {/* Main image */}
        <div className="group relative h-64 overflow-hidden rounded-lg border border-border bg-surface sm:h-80 lg:h-96">
          {active ? (
            <>
              <img src={active.image} alt={productName} className="h-full w-full object-cover" />
              <button
                onClick={() => setLightbox(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100"
                aria-label="Zoom"
              >
                <ZoomIn className="h-9 w-9 text-white drop-shadow-lg" />
              </button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-2/3 w-2/3 rounded-full border-[20px] border-foreground/20" />
            </div>
          )}

          {resolved.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow hover:bg-background"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow hover:bg-background"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">
                {idx + 1} / {resolved.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {resolved.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {resolved.map((im, i) => (
              <button
                key={im.id}
                onClick={() => setIdx(i)}
                className={`aspect-square w-14 flex-shrink-0 overflow-hidden rounded border-2 transition ${
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
      </div>

      {/* Lightbox */}
      {lightbox && active && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          {resolved.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}
          <img
            src={active.image}
            alt={productName}
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function SpecTile({
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
      <div className={`mt-0.5 text-sm font-semibold ${highlight ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}
