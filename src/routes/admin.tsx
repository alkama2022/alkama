import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect, useId, type FormEvent, type ReactNode } from "react";
import {
  api,
  mediaUrl,
  type Paginated,
  type Product,
  type ProductImage,
  type Brand,
  type Category,
  type Review,
  type Cart,
  type SentCartMessage,
} from "@/lib/api";
import { login, logout, useAuth, type AuthUser } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import {
  Check,
  ChevronDown,
  ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin — Apex Tyres" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

// ---------------------------------------------------------------------------
// Auth gate
// ---------------------------------------------------------------------------

function AdminPage() {
  const { token, user } = useAuth();
  if (!token) return <LoginScreen />;
  if (user && user.is_superuser === false) return <DeniedScreen user={user} />;
  return <AdminShell user={user} />;
}

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(username, password);
      if (u.is_superuser === false) { setError("Not a superuser."); await logout(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="w-full rounded-lg border border-border bg-card p-6 shadow-lg">
        <h1 className="font-display text-3xl uppercase">Admin <span className="text-primary">Login</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">Superuser access only.</p>
        <label className="mt-6 block text-xs uppercase tracking-widest text-muted-foreground">Username</label>
        <input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 outline-none focus:border-primary" required />
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">Password</label>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 outline-none focus:border-primary" required />
        {error && <p className="mt-3 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={busy}
          className="mt-6 w-full rounded bg-primary px-4 py-2 font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function DeniedScreen({ user }: { user: AuthUser }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-4xl uppercase text-destructive">403</h1>
      <p className="mt-2 text-muted-foreground">{user.username} — superuser required.</p>
      <button onClick={() => logout()} className="mt-6 rounded border border-border px-4 py-2 text-sm font-semibold uppercase tracking-widest hover:bg-card">Sign out</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin shell
// ---------------------------------------------------------------------------

type TabKey = "products" | "images" | "brands" | "categories" | "reviews" | "orders" | "carts" | "messages";

const TABS: { key: TabKey; label: string }[] = [
  { key: "products",   label: "Products" },
  { key: "images",     label: "Images" },
  { key: "brands",     label: "Brands" },
  { key: "categories", label: "Categories" },
  { key: "reviews",    label: "Reviews" },
  { key: "orders",     label: "Orders" },
  { key: "carts",      label: "Carts" },
  { key: "messages",   label: "Messages" },
];

function AdminShell({ user }: { user: AuthUser | null }) {
  const [tab, setTab] = useState<TabKey>("products");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl uppercase">Admin <span className="text-primary">Dashboard</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as <strong>{user?.username || "superuser"}</strong></p>
        </div>
        <button onClick={() => logout()} className="rounded border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest hover:bg-card">Sign out</button>
      </div>

      <StatsRow />

      <div className="mt-8 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-semibold uppercase tracking-widest transition ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "products"   && <ProductsTable />}
        {tab === "images"     && <ImagesTab />}
        {tab === "brands"     && <BrandsTable />}
        {tab === "categories" && <CategoriesTable />}
        {tab === "reviews"    && <ReviewsTable />}
        {tab === "orders"     && <OrdersTable />}
        {tab === "carts"      && <CartsTable />}
        {tab === "messages"   && <MessagesTable />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

function StatsRow() {
  const products = useQuery({ queryKey: ["admin-count", "products"], queryFn: () => api<Paginated<Product>>(`/products/?page_size=1`) });
  const brands   = useQuery({ queryKey: ["admin-count", "brands"],   queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`) });
  const messages = useQuery({ queryKey: ["admin-count", "messages"], queryFn: () => api<Paginated<SentCartMessage> | SentCartMessage[]>(`/messages/?page_size=1`), retry: false });

  const pc = products.data?.count ?? 0;
  const bc = Array.isArray(brands.data) ? brands.data.length : brands.data?.count ?? 0;
  const mc = Array.isArray(messages.data) ? messages.data.length : (messages.data as Paginated<SentCartMessage> | undefined)?.count ?? 0;

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Products"  value={pc} loading={products.isLoading} />
      <StatCard label="Brands"    value={bc} loading={brands.isLoading} />
      <StatCard label="Messages"  value={mc} loading={messages.isLoading} error={messages.isError} />
    </div>
  );
}

function StatCard({ label, value, loading, error }: { label: string; value: number; loading?: boolean; error?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl text-primary">
        {loading ? "…" : error ? "—" : value.toLocaleString()}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

const inputCls = "w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function TableShell({ columns, loading, error, empty, children }: { columns: string[]; loading?: boolean; error?: boolean; empty?: boolean; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-widest text-muted-foreground">
          <tr>{columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={columns.length} className="px-4 py-6 text-muted-foreground">Loading…</td></tr>}
          {error   && <tr><td colSpan={columns.length} className="px-4 py-6 text-destructive">Failed to load.</td></tr>}
          {!loading && !error && empty && <tr><td colSpan={columns.length} className="px-4 py-6 text-muted-foreground">Nothing here.</td></tr>}
          {children}
        </tbody>
      </table>
    </div>
  );
}

function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>;
}

function PrimaryBtn({ onClick, children, type = "button", disabled }: { onClick?: () => void; children: ReactNode; type?: "button" | "submit"; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-60 hover:brightness-110">
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children, danger }: { onClick?: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`rounded border px-2 py-1 text-xs font-semibold uppercase tracking-widest ${danger
        ? "border-destructive/40 text-destructive hover:bg-destructive/10"
        : "border-border text-muted-foreground hover:bg-surface hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl uppercase">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function confirmDelete(name: string) {
  return typeof window !== "undefined" && window.confirm(`Delete ${name}? This cannot be undone.`);
}

function StockBadge({ n }: { n: number }) {
  if (n === 0) return <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">Out</span>;
  if (n < 10)  return <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-500">Low ({n})</span>;
  return <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500">{n}</span>;
}

function useCrud<T>(resource: string, queryKey: unknown[]) {
  const qc = useQueryClient();
  const invalidate = () => { qc.invalidateQueries({ queryKey }); qc.invalidateQueries({ queryKey: ["admin-count"] }); };
  const create = useMutation({ mutationFn: (data: Partial<T>) => api<T>(`/${resource}/`, { method: "POST", body: JSON.stringify(data) }), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, data }: { id: number | string; data: Partial<T> }) => api<T>(`/${resource}/${id}/`, { method: "PATCH", body: JSON.stringify(data) }), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: number | string) => api<void>(`/${resource}/${id}/`, { method: "DELETE" }), onSuccess: invalidate });
  return { create, update, remove };
}

// ---------------------------------------------------------------------------
// SearchSelect — filterable dropdown replacing plain <select>
// ---------------------------------------------------------------------------

type SelectOption = { id: number | string; label: string; sub?: string };

function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  required,
  loading,
}: {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  loading?: boolean;
}) {
  const id = useId();
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const wrapRef             = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.id) === value);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(opt: SelectOption) {
    onChange(String(opt.id));
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setQuery("");
  }

  return (
    <div ref={wrapRef} className="relative" id={id}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        className={`flex w-full items-center justify-between rounded border bg-background px-3 py-2 text-sm outline-none transition
          ${open ? "border-primary" : "border-border hover:border-primary/60"}
          ${required && !value ? "border-destructive/60" : ""}`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {loading ? "Loading…" : selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          {value && (
            <span onClick={clear} className="rounded p-0.5 hover:text-destructive" aria-label="Clear">
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-card shadow-xl">
          {/* Search input */}
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
            )}
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => select(o)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-surface
                    ${String(o.id) === value ? "bg-primary/10 text-primary" : ""}`}
                >
                  {String(o.id) === value && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                  <span className={String(o.id) === value ? "" : "pl-5"}>
                    {o.label}
                    {o.sub && <span className="ml-1 text-xs text-muted-foreground">({o.sub})</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Products tab
// ---------------------------------------------------------------------------

type ProductFormState = {
  model_name: string; brand_id: string; category_id: string;
  width: string; aspect_ratio: string; rim_diameter: string;
  load_index: string; speed_rating: string;
  price: string; discount_price: string; inventory: string;
  is_active: boolean; description: string;
};
const emptyProduct: ProductFormState = {
  model_name: "", brand_id: "", category_id: "",
  width: "", aspect_ratio: "", rim_diameter: "",
  load_index: "", speed_rating: "",
  price: "", discount_price: "", inventory: "0",
  is_active: true, description: "",
};

function ProductsTable() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [imagesFor, setImagesFor] = useState<Product | null>(null);

  const q = useQuery({
    queryKey: ["admin-products", search],
    queryFn: () => api<Paginated<Product>>(`/products/`, { params: { ordering: "-id", search: search || undefined, page_size: 100 } }),
  });
  const crud = useCrud<Product>("products", ["admin-products"]);
  const rows = q.data?.results ?? [];

  return (
    <>
      <Toolbar>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
          className="w-full max-w-sm rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <div className="ml-auto">
          <PrimaryBtn onClick={() => setCreating(true)}><Plus className="h-3 w-3" />New product</PrimaryBtn>
        </div>
      </Toolbar>

      <TableShell columns={["ID", "Image", "Model", "Brand", "Category", "Size", "Price", "Discount", "Stock", "Active", ""]}
        loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
        {rows.map((p) => {
          const primaryImg = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
          return (
            <tr key={p.id} className="border-t border-border hover:bg-surface/50">
              <td className="px-4 py-2 text-muted-foreground text-xs">#{p.id}</td>
              <td className="px-4 py-2">
                {primaryImg ? (
                  <img src={mediaUrl(primaryImg.image) ?? primaryImg.image} alt="" className="h-10 w-10 rounded object-cover border border-border" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-surface">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </td>
              <td className="px-4 py-2 font-semibold">{p.model_name}</td>
              <td className="px-4 py-2">{p.brand_name ?? p.brand}</td>
              <td className="px-4 py-2">{p.category_name ?? p.category}</td>
              <td className="px-4 py-2 text-xs">{p.width}/{p.aspect_ratio} R{p.rim_diameter}</td>
              <td className="px-4 py-2 font-display text-primary">₦{p.price}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{p.discount_price ? `₦${p.discount_price}` : "—"}</td>
              <td className="px-4 py-2"><StockBadge n={p.inventory} /></td>
              <td className="px-4 py-2">
                <span className={`text-xs font-semibold ${p.is_active !== false ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {p.is_active !== false ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1.5">
                  <GhostBtn onClick={() => setImagesFor(p)}><ImageIcon className="inline h-3 w-3" /> Images ({p.images?.length ?? 0})</GhostBtn>
                  <GhostBtn onClick={() => setEditing(p)}><Pencil className="inline h-3 w-3" /></GhostBtn>
                  <GhostBtn danger onClick={() => { if (confirmDelete(`"${p.model_name}"`)) crud.remove.mutate(p.id); }}><Trash2 className="inline h-3 w-3" /></GhostBtn>
                </div>
              </td>
            </tr>
          );
        })}
      </TableShell>

      {creating && (
        <ProductFormModal title="New product" initial={emptyProduct} onClose={() => setCreating(false)}
          onSubmit={async (data) => { await crud.create.mutateAsync(data); }} />
      )}
      {editing && (
        <ProductFormModal title={`Edit #${editing.id} — ${editing.model_name}`}
          initial={{
            model_name: editing.model_name, brand_id: "", category_id: "",
            width: String(editing.width), aspect_ratio: String(editing.aspect_ratio), rim_diameter: String(editing.rim_diameter),
            load_index: String(editing.load_index), speed_rating: editing.speed_rating,
            price: String(editing.price), discount_price: String(editing.discount_price ?? ""),
            inventory: String(editing.inventory), is_active: editing.is_active !== false,
            description: editing.description,
            id: editing.id,
          } as ProductFormState & { id: number }}
          brandName={String(editing.brand)} categoryName={String(editing.category)}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => { await crud.update.mutateAsync({ id: editing.id, data }); }} />
      )}
      {imagesFor && (
        <ProductImagesModal product={imagesFor} onClose={() => setImagesFor(null)}
          onDone={() => { setImagesFor(null); crud.update.reset(); q.refetch(); }} />
      )}
    </>
  );
}

// ── Product form modal ────────────────────────────────────────────────────

type PendingImage = { file: File; preview: string; is_primary: boolean };

function ProductFormModal({ title, initial, brandName, categoryName, onClose, onSubmit }: {
  title: string; initial: ProductFormState;
  brandName?: string; categoryName?: string;
  onClose: () => void; onSubmit: (data: Partial<Product>) => Promise<void>;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending images (local previews — uploaded after product saves)
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  const isEditing = !!brandName;
  const productId = isEditing ? (initial as unknown as { id?: number }).id : undefined;

  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`) });
  const cats   = useQuery({ queryKey: ["cats"],   queryFn: () => api<Paginated<Category> | Category[]>(`/productsCategories/`) });
  const brandList = Array.isArray(brands.data) ? brands.data : brands.data?.results ?? [];
  const catList   = Array.isArray(cats.data)   ? cats.data   : cats.data?.results   ?? [];

  // Existing images/reviews when editing
  const imagesQ = useQuery({
    queryKey: ["product-images", productId],
    queryFn: () => api<Product>(`/products/${productId}/`),
    enabled: !!productId,
  });
  const reviewsQ = useQuery({
    queryKey: ["admin-reviews-inline", productId],
    queryFn: () => api<Review[] | { results: Review[] }>(`/products/${productId}/reviews/`),
    enabled: !!productId,
  });
  const existingImages: ProductImage[] = imagesQ.data?.images ?? [];
  const existingReviews: Review[] = Array.isArray(reviewsQ.data)
    ? reviewsQ.data
    : (reviewsQ.data as { results: Review[] } | undefined)?.results ?? [];

  const deleteImg = useMutation({
    mutationFn: (imgId: number) => api<void>(`/products/${productId}/images/${imgId}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-images", productId] }),
  });
  const setPrimaryMut = useMutation({
    mutationFn: (imgId: number) =>
      api<ProductImage>(`/products/${productId}/images/${imgId}/`, { method: "PATCH", body: JSON.stringify({ is_primary: true }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-images", productId] }),
  });
  const deleteReview = useMutation({
    mutationFn: (rid: number) => api<void>(`/products/${productId}/reviews/${rid}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews-inline", productId] }),
  });

  const resolvedBrandId    = form.brand_id    || String(brandList.find((b) => b.name === brandName)?.id   ?? "");
  const resolvedCategoryId = form.category_id || String(catList.find((c)  => c.name === categoryName)?.id ?? "");

  // Pre-populate brand/category ids from name when editing (runs once when list loads)
  useEffect(() => {
    if (brandName && !form.brand_id && brandList.length > 0) {
      const found = brandList.find((b) => b.name === brandName);
      if (found) setForm((f) => ({ ...f, brand_id: String(found.id) }));
    }
  }, [brandList, brandName, form.brand_id]);

  useEffect(() => {
    if (categoryName && !form.category_id && catList.length > 0) {
      const found = catList.find((c) => c.name === categoryName);
      if (found) setForm((f) => ({ ...f, category_id: String(found.id) }));
    }
  }, [catList, categoryName, form.category_id]);

  function set<K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Pick local image files — show preview immediately, no upload yet
  function pickImages(files: FileList | null) {
    if (!files) return;
    const newImages: PendingImage[] = Array.from(files).map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      is_primary: pendingImages.length === 0 && i === 0,
    }));
    setPendingImages((prev) => {
      const merged = [...prev, ...newImages];
      // Ensure exactly one primary
      const hasPrimary = merged.some((im) => im.is_primary);
      if (!hasPrimary && merged.length > 0) merged[0].is_primary = true;
      return merged;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePending(idx: number) {
    setPendingImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (prev[idx].is_primary && next.length > 0) next[0].is_primary = true;
      return next;
    });
  }

  function setPendingPrimary(idx: number) {
    setPendingImages((prev) => prev.map((im, i) => ({ ...im, is_primary: i === idx })));
  }

  function addReviewDraft(_e: FormEvent) { /* removed */ }
  function removePendingReview(_id: string) { /* removed */ }

  async function uploadPendingToProduct(pid: number) {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("apex.admin.token") : null;
    const authHeader: Record<string, string> = token ? { Authorization: `JWT ${token}` } : {};
    const origin = API_URL.replace(/\/api\/?$/, "");

    // Upload images only
    for (const im of pendingImages) {
      const fd = new FormData();
      fd.append("image", im.file);
      fd.append("is_primary", im.is_primary ? "true" : "false");
      const res = await fetch(`${origin}/api/products/${pid}/images/`, {
        method: "POST",
        headers: authHeader,
        body: fd,
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Image upload failed: ${res.status} — ${t}`); }
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const brandIdNum = Number(form.brand_id || resolvedBrandId);
    const categoryIdNum = Number(form.category_id || resolvedCategoryId);
    if (!brandIdNum) { setError("Please select a brand."); setBusy(false); return; }
    if (!categoryIdNum) { setError("Please select a category."); setBusy(false); return; }
    try {
      await onSubmit({
        model_name: form.model_name,
        brand: brandIdNum as unknown as string,
        category: categoryIdNum as unknown as string,
        width: Number(form.width), aspect_ratio: Number(form.aspect_ratio), rim_diameter: Number(form.rim_diameter),
        load_index: Number(form.load_index), speed_rating: form.speed_rating,
        price: form.price,
        discount_price: form.discount_price || null,
        inventory: Number(form.inventory),
        is_active: form.is_active,
        description: form.description,
      } as Partial<Product>);
      // Upload pending images
      if (pendingImages.length > 0) {
        let pid = productId;
        if (!pid) {
          const list = await api<Paginated<Product>>(`/products/`, { params: { ordering: "-id", page_size: 1 } });
          pid = list.results[0]?.id;
        }
        if (pid) await uploadPendingToProduct(pid);
      }

      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={title} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-3">

        {/* ── Product fields ── */}
        <Field label="Model name">
          <input className={inputCls} value={form.model_name} onChange={(e) => set("model_name", e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <select className={inputCls} value={resolvedBrandId} onChange={(e) => set("brand_id", e.target.value)} required>
              <option value="">— select —</option>
              {brandList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className={inputCls} value={resolvedCategoryId} onChange={(e) => set("category_id", e.target.value)} required>
              <option value="">— select —</option>
              {catList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Width (mm)"><input type="number" className={inputCls} value={form.width} onChange={(e) => set("width", e.target.value)} required /></Field>
          <Field label="Aspect ratio"><input type="number" className={inputCls} value={form.aspect_ratio} onChange={(e) => set("aspect_ratio", e.target.value)} required /></Field>
          <Field label="Rim diameter"><input type="number" className={inputCls} value={form.rim_diameter} onChange={(e) => set("rim_diameter", e.target.value)} required /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Load index"><input type="number" className={inputCls} value={form.load_index} onChange={(e) => set("load_index", e.target.value)} required /></Field>
          <Field label="Speed rating"><input className={inputCls} value={form.speed_rating} onChange={(e) => set("speed_rating", e.target.value)} required /></Field>
          <Field label="Inventory"><input type="number" min="0" className={inputCls} value={form.inventory} onChange={(e) => set("inventory", e.target.value)} required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₦)"><input className={inputCls} value={form.price} onChange={(e) => set("price", e.target.value)} required placeholder="0.00" /></Field>
          <Field label="Discount price (₦)"><input className={inputCls} value={form.discount_price} onChange={(e) => set("discount_price", e.target.value)} placeholder="Leave blank if none" /></Field>
        </div>
        <Field label="Description"><textarea rows={3} className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="rounded" />
          Active (visible on storefront)
        </label>

        {error && <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save product"}
          </PrimaryBtn>
        </div>
      </form>

      {/* ── Images inline — independent section, NOT inside the form ── */}
      {/* Rendered below the product form as a standalone entity (like Django TabularInline) */}
      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Images</span>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-semibold hover:border-primary hover:text-primary transition">
            <Plus className="h-3 w-3" /> Add image
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => pickImages(e.target.files)} />
        </div>

        {/* Existing images (editing only) */}
        {isEditing && existingImages.length > 0 && (
          <div className="mb-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {existingImages.map((im) => {
              const src = mediaUrl(im.image) ?? im.image;
              return (
                <div key={im.id} className="group relative">
                  <img src={src} alt="" className="aspect-square w-full rounded border border-border object-cover" />
                  {im.is_primary && (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">Primary</span>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded bg-black/50 opacity-0 transition group-hover:opacity-100">
                    {!im.is_primary && (
                      <button type="button" onClick={() => setPrimaryMut.mutate(im.id)}
                        className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white hover:bg-white/40">
                        Set primary
                      </button>
                    )}
                    <button type="button" onClick={() => { if (confirmDelete("this image")) deleteImg.mutate(im.id); }}
                      className="rounded bg-destructive/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white hover:bg-destructive">
                      <Trash2 className="inline h-2.5 w-2.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending (local preview) images — queued for upload on save */}
        {pendingImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {pendingImages.map((im, idx) => (
              <div key={idx} className="group relative">
                <img src={im.preview} alt="" className="aspect-square w-full rounded border-2 border-dashed border-primary/60 object-cover" />
                {im.is_primary && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">Primary</span>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded bg-black/50 opacity-0 transition group-hover:opacity-100">
                  {!im.is_primary && (
                    <button type="button" onClick={() => setPendingPrimary(idx)}
                      className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white hover:bg-white/40">
                      Set primary
                    </button>
                  )}
                  <button type="button" onClick={() => removePending(idx)}
                    className="rounded bg-destructive/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white hover:bg-destructive">
                    <X className="inline h-2.5 w-2.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingImages.length === 0 && (!isEditing || existingImages.length === 0) && (
          <p className="text-xs text-muted-foreground">No images — click "Add image" to pick files.</p>
        )}
      </div>
    </Modal>
  );
}

// ── Product images modal ──────────────────────────────────────────────────

function ProductImagesModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["product-images", product.id],
    queryFn: () => api<Product>(`/products/${product.id}/`),
  });
  const images: ProductImage[] = q.data?.images ?? product.images ?? [];

  const deleteImg = useMutation({
    mutationFn: (imgId: number) => api<void>(`/products/${product.id}/images/${imgId}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-images", product.id] }),
  });

  const setPrimary = useMutation({
    mutationFn: (imgId: number) =>
      api<ProductImage>(`/products/${product.id}/images/${imgId}/`, { method: "PATCH", body: JSON.stringify({ is_primary: true }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-images", product.id] }),
  });

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true); setUploadError(null);
    const token = typeof window !== "undefined" ? window.localStorage.getItem("apex.admin.token") : null;
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("image", file);
        fd.append("is_primary", images.length === 0 ? "true" : "false");
        const origin = API_URL.replace(/\/api\/?$/, "");
        const res = await fetch(`${origin}/api/products/${product.id}/images/`, {
          method: "POST",
          headers: token ? { Authorization: `JWT ${token}` } : {},
          body: fd,
        });
        if (!res.ok) { const t = await res.text(); throw new Error(`${res.status} — ${t}`); }
      }
      await qc.invalidateQueries({ queryKey: ["product-images", product.id] });
    } catch (err) { setUploadError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <Modal title={`Images — ${product.model_name}`} onClose={onClose} wide>
      {/* Upload */}
      <div className="mb-4 rounded-lg border-2 border-dashed border-border p-4 text-center">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => uploadFiles(e.target.files)} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-60 hover:brightness-110">
          <Upload className="h-4 w-4" />{uploading ? "Uploading…" : "Upload images"}
        </button>
        <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP — multiple allowed</p>
        {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
      </div>

      {/* Grid */}
      {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {images.length === 0 && !q.isLoading && <p className="text-sm text-muted-foreground">No images yet.</p>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((im) => {
          const src = mediaUrl(im.image) ?? im.image;
          return (
            <div key={im.id} className="group relative">
              <img src={src} alt="" className="aspect-square w-full rounded-lg border border-border object-cover" />
              {im.is_primary && (
                <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Primary</span>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-black/50 opacity-0 transition group-hover:opacity-100">
                {!im.is_primary && (
                  <button onClick={() => setPrimary.mutate(im.id)}
                    className="rounded bg-white/20 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-white/40">
                    Set primary
                  </button>
                )}
                <button onClick={() => { if (confirmDelete("this image")) deleteImg.mutate(im.id); }}
                  className="rounded bg-destructive/80 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-destructive">
                  <Trash2 className="inline h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <PrimaryBtn onClick={onDone}>Done</PrimaryBtn>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Images tab — standalone image manager across all products
// ---------------------------------------------------------------------------

function ImagesTab() {
  const [productId, setProductId] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

  const productsQ = useQuery({
    queryKey: ["admin-products-for-images"],
    queryFn: () => api<Paginated<Product>>(`/products/`, { params: { page_size: 200, ordering: "model_name" } }),
  });
  const rows = productsQ.data?.results ?? [];

  function pick(id: string) {
    setProductId(id);
    setSelected(rows.find((p) => String(p.id) === id) ?? null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-sm">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Select product</label>
          <select value={productId} onChange={(e) => pick(e.target.value)} className={`mt-1 ${inputCls}`}>
            <option value="">— choose —</option>
            {rows.map((p) => <option key={p.id} value={p.id}>{p.model_name} ({p.brand})</option>)}
          </select>
        </div>
      </div>
      {selected && <ProductImagesModal product={selected} onClose={() => setSelected(null)} onDone={() => setSelected(null)} />}
      {!selected && productId && (
        <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground text-sm">
          Product selected — click "Manage images" to open the image editor.
          <div className="mt-3">
            <PrimaryBtn onClick={() => { const p = rows.find((r) => String(r.id) === productId); if (p) setSelected(p); }}>
              <ImageIcon className="h-3 w-3" /> Manage images
            </PrimaryBtn>
          </div>
        </div>
      )}
      {!productId && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Select a product above to upload, remove, or set primary images.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brands & Categories (name-only CRUD)
// ---------------------------------------------------------------------------

function NameOnlyTable({ resource, apiPath, queryKey, label }: {
  resource: string; apiPath: string; queryKey: string; label: string;
}) {
  const q = useQuery({ queryKey: [queryKey], queryFn: () => api<Paginated<Brand | Category> | (Brand | Category)[]>(`/${apiPath}/`) });
  const crud = useCrud<Brand | Category>(resource, [queryKey]);
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Brand | Category | null>(null);

  return (
    <>
      <Toolbar>
        <div className="ml-auto">
          <PrimaryBtn onClick={() => setCreating(true)}><Plus className="h-3 w-3" />New {label}</PrimaryBtn>
        </div>
      </Toolbar>
      <TableShell columns={["ID", "Name", "Products", ""]} loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="px-4 py-3 text-muted-foreground text-xs">#{r.id}</td>
            <td className="px-4 py-3 font-semibold">{r.name}</td>
            <td className="px-4 py-3">{r.products_count ?? "—"}</td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2">
                <GhostBtn onClick={() => setEditing(r)}><Pencil className="inline h-3 w-3" /></GhostBtn>
                <GhostBtn danger onClick={() => { if (confirmDelete(`"${r.name}"`)) crud.remove.mutate(r.id); }}><Trash2 className="inline h-3 w-3" /></GhostBtn>
              </div>
            </td>
          </tr>
        ))}
      </TableShell>
      {creating && (
        <NameFormModal title={`New ${label}`} initial="" onClose={() => setCreating(false)}
          onSubmit={async (name) => { await crud.create.mutateAsync({ name } as Partial<Brand>); setCreating(false); }} />
      )}
      {editing && (
        <NameFormModal title={`Edit ${label} #${editing.id}`} initial={editing.name} onClose={() => setEditing(null)}
          onSubmit={async (name) => { await crud.update.mutateAsync({ id: editing!.id, data: { name } as Partial<Brand> }); setEditing(null); }} />
      )}
    </>
  );
}

function NameFormModal({ title, initial, onClose, onSubmit }: {
  title: string; initial: string; onClose: () => void; onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try { await onSubmit(name); }
    catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name"><input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        {error && <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        </div>
      </form>
    </Modal>
  );
}

function BrandsTable()     { return <NameOnlyTable resource="productsBrand"      apiPath="productsBrand"      queryKey="admin-brands"     label="brand" />; }
function CategoriesTable() { return <NameOnlyTable resource="productsCategories" apiPath="productsCategories" queryKey="admin-categories"  label="category" />; }

// ---------------------------------------------------------------------------
// Reviews tab
// ---------------------------------------------------------------------------

type AdminReview = Review & { product?: number; date?: string };

function ReviewsTable() {
  const products = useQuery({
    queryKey: ["admin-products-for-reviews"],
    queryFn: () => api<Paginated<Product>>(`/products/?page_size=200&ordering=-id`),
  });
  const productList = products.data?.results ?? [];
  return (
    <TableShell columns={["Product", "Reviewer", "Review", "Date", ""]}
      loading={products.isLoading} error={products.isError} empty={productList.length === 0}>
      {productList.map((p) => <ProductReviews key={p.id} product={p} />)}
    </TableShell>
  );
}

function ProductReviews({ product }: { product: Product }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-reviews", product.id],
    queryFn: () => api<Paginated<AdminReview> | AdminReview[]>(`/products/${product.id}/reviews/`),
  });
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/products/${product.id}/reviews/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews", product.id] }),
  });
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map((r) => (
        <tr key={`${product.id}-${r.id}`} className="border-t border-border">
          <td className="px-4 py-3 font-semibold">{product.model_name}</td>
          <td className="px-4 py-3">{r.name}</td>
          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{r.description}</td>
          <td className="px-4 py-3 text-xs text-muted-foreground">{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
          <td className="px-4 py-3">
            <div className="flex justify-end">
              <GhostBtn danger onClick={() => { if (confirmDelete(`review by "${r.name}"`)) remove.mutate(r.id); }}><Trash2 className="inline h-3 w-3" /></GhostBtn>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Orders tab
// ---------------------------------------------------------------------------

type AdminOrder = {
  id: number;
  customer?: number | { id: number; first_name?: string; last_name?: string };
  payment_status?: string;
  placed_at?: string;
  items?: { id: number; product?: { model_name: string }; quantity: number; unit_price: string | number }[];
};

function OrdersTable() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const q = useQuery({ queryKey: ["admin-orders"], queryFn: () => api<Paginated<AdminOrder> | AdminOrder[]>(`/orders/`), retry: false });
  const crud = useCrud<AdminOrder>("orders", ["admin-orders"]);
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];

  return (
    <>
      <TableShell columns={["ID", "Customer", "Status", "Items", "Total", "Date", ""]}
        loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
        {rows.map((o) => {
          const items = o.items ?? [];
          const total = items.reduce((s: number, it: NonNullable<AdminOrder["items"]>[0]) => s + Number(it.unit_price) * it.quantity, 0);
          const customer = typeof o.customer === "object" && o.customer
            ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ") || `#${o.customer.id}`
            : o.customer ? `#${o.customer}` : "—";
          const isOpen = expanded === o.id;
          return (
            <>
              <tr key={o.id} className="border-t border-border hover:bg-surface/50">
                <td className="px-4 py-3 text-xs text-muted-foreground">#{o.id}</td>
                <td className="px-4 py-3 font-semibold">{customer}</td>
                <td className="px-4 py-3">
                  <select defaultValue={o.payment_status || "P"}
                    onChange={(e) => crud.update.mutate({ id: o.id, data: { payment_status: e.target.value } as Partial<AdminOrder> })}
                    className="rounded border border-border bg-background px-2 py-1 text-xs uppercase tracking-widest">
                    <option value="P">Pending</option>
                    <option value="C">Complete</option>
                    <option value="F">Failed</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setExpanded(isOpen ? null : o.id)}
                    className="rounded border border-border px-2 py-0.5 text-xs hover:border-primary hover:text-primary">
                    {items.length} {isOpen ? "▲" : "▼"}
                  </button>
                </td>
                <td className="px-4 py-3 font-display text-primary">₦{total.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{o.placed_at ? new Date(o.placed_at).toLocaleString() : "—"}</td>
                <td className="px-4 py-3">
                  <GhostBtn danger onClick={() => { if (confirmDelete(`order #${o.id}`)) crud.remove.mutate(o.id); }}><Trash2 className="inline h-3 w-3" /></GhostBtn>
                </td>
              </tr>
              {isOpen && items.length > 0 && (
                <tr key={`${o.id}-items`} className="border-t border-border bg-surface/30">
                  <td colSpan={7} className="px-6 py-3">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground uppercase tracking-widest">
                        <tr><th className="pb-1 text-left">Product</th><th className="pb-1 text-right">Qty</th><th className="pb-1 text-right">Unit price</th><th className="pb-1 text-right">Subtotal</th></tr>
                      </thead>
                      <tbody>
                        {items.map((it: NonNullable<AdminOrder["items"]>[0]) => (
                          <tr key={it.id}>
                            <td className="py-0.5">{it.product?.model_name ?? `#${it.id}`}</td>
                            <td className="py-0.5 text-right">{it.quantity}</td>
                            <td className="py-0.5 text-right">₦{Number(it.unit_price).toFixed(2)}</td>
                            <td className="py-0.5 text-right font-semibold">₦{(Number(it.unit_price) * it.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </TableShell>
    </>
  );
}

// ---------------------------------------------------------------------------
// Carts tab
// ---------------------------------------------------------------------------

function CartsTable() {
  const q = useQuery({ queryKey: ["admin-carts"], queryFn: () => api<Paginated<Cart> | Cart[]>(`/cart/`), retry: false });
  const crud = useCrud<Cart>("cart", ["admin-carts"]);
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <TableShell columns={["Cart ID", "Items", "Total", ""]}
      loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
      {rows.map((c) => (
        <tr key={c.id} className="border-t border-border">
          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.id}</td>
          <td className="px-4 py-3">{c.items?.length ?? 0}</td>
          <td className="px-4 py-3 font-display text-primary">₦{Number(c.total_price ?? 0).toFixed(2)}</td>
          <td className="px-4 py-3">
            <div className="flex justify-end">
              <GhostBtn danger onClick={() => { if (confirmDelete(`cart ${c.id}`)) crud.remove.mutate(c.id); }}><Trash2 className="inline h-3 w-3" /></GhostBtn>
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------------------------------------------------------------------------
// Messages tab
// ---------------------------------------------------------------------------

function MessagesTable() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-messages"], queryFn: () => api<Paginated<SentCartMessage> | SentCartMessage[]>(`/messages/`) });
  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/messages/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-messages"] }),
  });
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];

  return (
    <div className="space-y-3">
      {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {q.isError && <p className="text-sm text-destructive">Failed to load messages.</p>}
      {rows.map((m) => (
        <div key={m.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-semibold">{m.contact_name}</div>
              <div className="text-xs text-muted-foreground">{m.contact_phone} · {new Date(m.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-display text-xl text-primary">₦{Number(m.total_price).toFixed(2)}</div>
              <GhostBtn danger onClick={() => { if (confirmDelete(`message from "${m.contact_name}"`)) remove.mutate(m.id); }}><Trash2 className="inline h-3 w-3" /></GhostBtn>
            </div>
          </div>
          {m.contact_note && <p className="mt-2 text-sm text-muted-foreground">{m.contact_note}</p>}
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background p-3 text-xs text-muted-foreground">{m.message_text}</pre>
          {m.whatsapp_url && (
            <a href={m.whatsapp_url} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-semibold uppercase tracking-widest text-primary hover:underline">
              Open WhatsApp →
            </a>
          )}
        </div>
      ))}
      {!q.isLoading && rows.length === 0 && <p className="text-muted-foreground">No messages yet.</p>}
    </div>
  );
}
