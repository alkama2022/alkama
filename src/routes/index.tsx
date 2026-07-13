import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type Brand, type Paginated, type Product } from "@/lib/api";
import { ArrowRight, ShieldCheck, Truck, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const featured = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => api<Paginated<Product> | Product[]>(`/products/?ordering=-id`),
  });
  const brands = useQuery({
    queryKey: ["home-brands"],
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`),
  });

  const products =
    (Array.isArray(featured.data) ? featured.data : featured.data?.results ?? []).slice(0, 6);
  const brandList = Array.isArray(brands.data) ? brands.data : brands.data?.results ?? [];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 diagonal-stripes opacity-40" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
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
                className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold uppercase tracking-widest hover:border-primary hover:text-primary transition"
              >
                Find my size
              </Link>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="relative aspect-square w-full max-w-md">
              <div className="absolute inset-0 rounded-full border-[24px] border-foreground/90" />
              <div className="absolute inset-8 rounded-full border-[10px] border-primary/80" />
              <div className="absolute inset-16 rounded-full border-4 border-dashed border-foreground/40" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-6xl text-primary">APEX</span>
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
            { icon: ShieldCheck, title: "Genuine brands", body: "Only authentic, warrantied tyres." },
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
          <Link to="/products" className="text-sm font-semibold uppercase tracking-widest hover:text-primary">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.isLoading && Array.from({ length: 6 }).map((_, i) => (
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
  const img = product.images?.find((i) => i.is_primary) || product.images?.[0];
  const extraImages = (product.images ?? []).length;
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary hover:shadow-lg">
      <Link
        to="/products/$id"
        params={{ id: String(product.id) }}
        className="relative aspect-square overflow-hidden bg-surface block"
      >
        {img ? (
          <img
            src={img.image}
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
        {extraImages > 1 && (
          <div className="absolute right-3 bottom-3 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            +{extraImages - 1} photo{extraImages > 2 ? "s" : ""}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {product.category}
        </div>
        <div className="mt-1 font-display text-xl uppercase leading-tight">
          {product.model_name}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {product.width}/{product.aspect_ratio} R{product.rim_diameter} · {product.load_index}
          {product.speed_rating}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-display text-2xl text-primary">${product.price}</span>
          <Link
            to="/products/$id"
            params={{ id: String(product.id) }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 transition"
          >
            View product
          </Link>
        </div>
      </div>
    </div>
  );
}
