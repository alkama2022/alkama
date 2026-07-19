import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, mediaUrl, type Brand, type Paginated, type Product } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import { ArrowRight, Check, Eye, ShieldCheck, ShoppingCart, Truck, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const featured = useQuery({
    queryKey: ["featured-products"],
    queryFn: () =>
      api<Paginated<Product> | Product[]>(`/products/`, {
        params: {
          ordering: "-id",
          page_size: 3,
        },
      }),
  });
  const brands = useQuery({
    queryKey: ["home-brands"],
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`),
  });

  const products = (
    Array.isArray(featured.data) ? featured.data : (featured.data?.results ?? [])
  ).slice(0, 3);
  const brandList = Array.isArray(brands.data) ? brands.data : (brands.data?.results ?? []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Full-bleed background image with dark overlay */}
        <div className="absolute inset-0">
          <img
            src="/hero-tyres.jpg"
            alt=""
            className="h-full w-full object-cover object-center"
            aria-hidden
          />
          <div className="absolute inset-0 bg-background/80" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          {/* Left: copy */}
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Season Launch · 2026
            </span>
            <h1 className="font-display text-5xl uppercase leading-none tracking-wide sm:text-7xl">
              Grip the road.
              <br />
              <span className="text-primary">Own the drive.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base text-muted-foreground">
              Performance tyres from the brands you trust — matched to your car, delivered fast,
              fitted by pros.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 transition"
              >
                Shop tyres <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background/60 px-6 py-3 text-sm font-semibold uppercase tracking-widest backdrop-blur-sm hover:border-primary hover:text-primary transition"
              >
                Find my size
              </Link>
            </div>
          </div>

          {/* Right: photo card */}
          <div className="relative hidden items-center justify-center md:flex">
            <div className="relative h-full max-h-[420px] w-full overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
              <img
                src="/hero-tyres.jpg"
                alt="Khal Tyres shop — stacked tyres ready for dispatch"
                className="h-full w-full object-cover object-center"
              />
              {/* shop name badge */}
              <div className="absolute bottom-4 left-4 rounded-lg bg-background/80 px-4 py-2 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Your local store
                </p>
                <p className="font-display text-lg uppercase text-primary leading-tight">
                  Khal Tyres Co.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USPs */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
          {[
            { icon: Truck, title: "Fast dispatch", body: "In-stock orders ship same day." },
            {
              icon: ShieldCheck,
              title: "Genuine brands",
              body: "Only authentic, warrantied tyres.",
            },
            { icon: Wrench, title: "Expert fitment", body: "Certified installers in your city." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="rounded-md bg-primary/10 p-3 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wide">{title}</div>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl uppercase sm:text-4xl">
            Fresh <span className="text-primary">rubber</span>
          </h2>
          <Link
            to="/products"
            className="text-sm font-semibold uppercase tracking-widest hover:text-primary"
          >
            View all →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-lg bg-surface" />
            ))}
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          {!featured.isLoading && products.length === 0 && (
            <p className="text-muted-foreground">No products yet.</p>
          )}
        </div>
      </section>

      {/* Brands */}
      {brandList.length > 0 && (
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Brands we carry
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {brandList.map((b) => (
                <Link
                  key={b.id}
                  to="/products"
                  search={{ brand: b.id }}
                  className="rounded-md border border-border px-4 py-2 font-display text-xl uppercase tracking-wide hover:border-primary hover:text-primary transition"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const qc = useQueryClient();
  const img = product.images?.find((i) => i.is_primary) || product.images?.[0];
  const imgSrc = mediaUrl(img?.image);
  const extraImages = (product.images ?? []).length;
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasDiscount = false; // discount_price removed from API
  const displayPrice = product.price;

  const add = useMutation({
    mutationFn: () => addToCart(product.id, qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      window.dispatchEvent(new Event("cart:updated"));
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
      toast.success(`${qty} × ${product.model_name} added to cart`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const outOfStock = product.inventory === 0;

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary hover:shadow-lg">
        {/* Image */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="relative aspect-square overflow-hidden bg-surface block w-full text-left"
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={product.model_name}
              className="h-full w-full object-cover transition group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-3/4 w-3/4 rounded-full border-8 border-foreground/70" />
            </div>
          )}
          <div className="absolute left-3 top-3 rounded bg-background/90 px-2 py-1 text-xs font-semibold uppercase tracking-wider">
            {product.brand}
          </div>
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="rounded bg-destructive px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                Out of stock
              </span>
            </div>
          )}
          {extraImages > 1 && !outOfStock && (
            <div className="absolute right-3 bottom-3 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
              +{extraImages - 1} photo{extraImages > 2 ? "s" : ""}
            </div>
          )}
        </button>

        {/* Info */}
        <div className="flex flex-1 flex-col p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {product.category}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mt-1 text-left font-display text-xl uppercase leading-tight hover:text-primary transition"
          >
            {product.model_name}
          </button>
          <div className="mt-1 text-sm text-muted-foreground">
            {product.tire_size} {/*· {product.load_index}{product.speed_rating} */}
          </div>

          {/* Price */}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl text-primary">₦{displayPrice}</span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">₦{product.price}</span>
            )}
          </div>

          {/* Qty stepper + Add to cart */}
          <div className="mt-4 flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border border-border bg-background">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1 || outOfStock}
                className="px-2 py-1.5 text-muted-foreground hover:text-primary disabled:opacity-30 transition"
                aria-label="Decrease"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(product.inventory, q + 1))}
                disabled={qty >= product.inventory || outOfStock}
                className="px-2 py-1.5 text-muted-foreground hover:text-primary disabled:opacity-30 transition"
                aria-label="Increase"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={outOfStock || add.isPending}
              onClick={() => add.mutate()}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-widest transition disabled:opacity-50 ${
                justAdded
                  ? "bg-green-600 text-white"
                  : "bg-primary text-primary-foreground hover:brightness-110"
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Added
                </>
              ) : add.isPending ? (
                "Adding…"
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" /> Add to cart
                </>
              )}
            </button>
          </div>

          {/* View product button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition"
          >
            <Eye className="h-3.5 w-3.5" /> View product
          </button>
        </div>
      </div>

      {/* Product detail drawer */}
      <ProductDetailDrawer
        productId={drawerOpen ? product.id : null}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
