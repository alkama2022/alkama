import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { api, type Brand, type Category, type Paginated, type Product } from "@/lib/api";
import { ProductCard } from "./index";
import { Search, Loader2 } from "lucide-react";
import { useInfiniteProducts, useBrands, useCategories } from "@/hooks/queries";

type ProductsSearch = {
  search?: string;
  brand?: number;
  category?: number;
  ordering?: string;
};

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, unknown>): ProductsSearch => ({
    search: typeof s.search === "string" ? s.search : undefined,
    brand: s.brand ? Number(s.brand) : undefined,
    category: s.category ? Number(s.category) : undefined,
    ordering: typeof s.ordering === "string" ? s.ordering : undefined,
  }),
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "Shop Tyres — Khal Tyres Company Limited" },
      {
        name: "description",
        content: "Browse premium performance tyres by brand, category, and size.",
      },
    ],
  }),
});

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const setSearch = (patch: Partial<ProductsSearch>) =>
    navigate({ search: (prev: ProductsSearch) => ({ ...prev, ...patch }) });

  const brands = useBrands();
  const cats = useCategories();

  const products = useInfiniteProducts({
    search: search.search,
    brand: search.brand,
    category: search.category,
    ordering: search.ordering,
  });

  const brandList = Array.isArray(brands.data) ? brands.data : (brands.data?.results ?? []);
  const catList = Array.isArray(cats.data) ? cats.data : (cats.data?.results ?? []);

  // Flatten all pages into a single product list
  const results = products.data?.pages.flatMap((p) => p.results) ?? [];
  const totalCount = products.data?.pages[0]?.count ?? 0;
  const hasMore = products.hasNextPage;

  // Intersection observer sentinel — triggers next page load
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !products.isFetchingNextPage) {
          products.fetchNextPage();
        }
      },
      { rootMargin: "200px" }, // start loading 200px before bottom
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, products.isFetchingNextPage, products.fetchNextPage]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-4xl uppercase sm:text-5xl">
          Shop <span className="text-primary">Tyres</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          {products.isLoading
            ? "Loading catalog…"
            : `${totalCount} product${totalCount === 1 ? "" : "s"} available`}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        {/* Filters — unchanged */}
        <aside className="space-y-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Search
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                defaultValue={search.search ?? ""}
                onChange={(e) => setSearch({ search: e.target.value || undefined })}
                placeholder="Model, size, brand…"
                className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <FilterGroup
            label="Brand"
            options={brandList.map((b) => ({ id: b.id, name: `${b.name} (${b.products_count})` }))}
            value={search.brand}
            onChange={(v) => setSearch({ brand: v })}
          />
          <FilterGroup
            label="Category"
            options={catList.map((c) => ({ id: c.id, name: `${c.name} (${c.products_count})` }))}
            value={search.category}
            onChange={(v) => setSearch({ category: v })}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Sort by
            </label>
            <select
              value={search.ordering ?? ""}
              onChange={(e) => setSearch({ ordering: e.target.value || undefined })}
              className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Default</option>
              <option value="price">Price: Low → High</option>
              <option value="-price">Price: High → Low</option>
              <option value="model_name">Name: A → Z</option>
              <option value="-model_name">Name: Z → A</option>
            </select>
          </div>

          <button
            onClick={() => navigate({ search: {} })}
            className="w-full rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase tracking-widest hover:border-primary hover:text-primary"
          >
            Clear filters
          </button>
        </aside>

        {/* Grid */}
        <div>
          {/* Initial loading skeletons */}
          {products.isLoading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-lg bg-surface" />
              ))}
            </div>
          )}

          {products.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
              Failed to load products. Check that the API is running at{" "}
              <code className="rounded bg-background px-1">{import.meta.env.VITE_API_URL}</code>.
            </div>
          )}

          {!products.isLoading && results.length === 0 && (
            <p className="text-muted-foreground">No products match your filters.</p>
          )}

          {/* Product grid — same ProductCard, same layout */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Sentinel — watched by IntersectionObserver */}
          <div ref={sentinelRef} className="h-4" />

          {/* Loading more indicator */}
          {products.isFetchingNextPage && (
            <div className="mt-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* End of results */}
          {!hasMore && results.length > 0 && !products.isLoading && (
            <p className="mt-8 text-center text-xs text-muted-foreground">
              All {totalCount} product{totalCount === 1 ? "" : "s"} loaded
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: number; name: string }[];
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="space-y-1">
        <button
          onClick={() => onChange(undefined)}
          className={`block w-full rounded px-2 py-1 text-left text-sm transition ${
            value === undefined ? "bg-primary/15 text-primary" : "hover:bg-surface"
          }`}
        >
          All
        </button>
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`block w-full rounded px-2 py-1 text-left text-sm transition ${
              value === o.id ? "bg-primary/15 text-primary" : "hover:bg-surface"
            }`}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}
