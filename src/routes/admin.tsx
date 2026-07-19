import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect, type FormEvent, type ReactNode } from "react";
import {
  api,
  mediaUrl,
  API_URL,
  type Paginated,
  type Product,
  type ProductImage,
  type Brand,
  type Category,
  type Review,
  type Cart,
  type CartItem,
  type SentCartMessage,
  type Customer,
  type Order,
  type OrderItem,
  type Address,
} from "@/lib/api";
import { login, logout, useAuth, type AuthUser } from "@/lib/auth";
import {
  Check,
  ChevronDown,
  ChevronRight,
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
    meta: [{ title: "Admin — Khal Tyres Company Limited" }, { name: "robots", content: "noindex" }],
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
      if (u.is_superuser === false) {
        setError("Not a superuser.");
        await logout();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full rounded-lg border border-border bg-card p-6 shadow-lg"
      >
        <h1 className="font-display text-3xl uppercase">
          Admin <span className="text-primary">Login</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Superuser access only.</p>
        <label className="mt-6 block text-xs uppercase tracking-widest text-muted-foreground">
          Username
        </label>
        <input
          autoFocus
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 outline-none focus:border-primary"
          required
        />
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2 outline-none focus:border-primary"
          required
        />
        {error && (
          <p className="mt-3 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded bg-primary px-4 py-2 font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
        >
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
      <button
        onClick={() => logout()}
        className="mt-6 rounded border border-border px-4 py-2 text-sm font-semibold uppercase tracking-widest hover:bg-card"
      >
        Sign out
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin shell & tabs
// ---------------------------------------------------------------------------

type TabKey =
  | "products"
  | "brands"
  | "categories"
  | "images"
  | "customers"
  | "orders"
  | "carts"
  | "reviews"
  | "messages";

const TABS: { key: TabKey; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "brands", label: "Brands" },
  { key: "categories", label: "Categories" },
  { key: "images", label: "Images" },
  { key: "customers", label: "Customers" },
  { key: "orders", label: "Orders" },
  { key: "carts", label: "Carts" },
  { key: "reviews", label: "Reviews" },
  { key: "messages", label: "Messages" },
];

function AdminShell({ user }: { user: AuthUser | null }) {
  const [tab, setTab] = useState<TabKey>("products");
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl uppercase">
            Admin <span className="text-primary">Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <strong>{user?.username || "superuser"}</strong>
          </p>
        </div>
        <button
          onClick={() => logout()}
          className="rounded border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest hover:bg-card"
        >
          Sign out
        </button>
      </div>

      <StatsRow />

      <div className="mt-8 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-semibold uppercase tracking-widest transition ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "products" && <ProductsTable />}
        {tab === "brands" && <BrandsTable />}
        {tab === "categories" && <CategoriesTable />}
        {tab === "images" && <ImagesTab />}
        {tab === "customers" && <CustomersTable />}
        {tab === "orders" && <OrdersTable />}
        {tab === "carts" && <CartsTable />}
        {tab === "reviews" && <ReviewsTable />}
        {tab === "messages" && <MessagesTable />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

function StatsRow() {
  const products = useQuery({
    queryKey: ["admin-count", "products"],
    queryFn: () => api<Paginated<Product>>(`/products/?page_size=1`),
  });
  const brands = useQuery({
    queryKey: ["admin-count", "brands"],
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`),
  });
  const customers = useQuery({
    queryKey: ["admin-count", "customers"],
    queryFn: () => api<Paginated<Customer> | Customer[]>(`/customers/`),
    retry: false,
  });
  const orders = useQuery({
    queryKey: ["admin-count", "orders"],
    queryFn: () => api<Paginated<Order> | Order[]>(`/orders/`),
    retry: false,
  });
  const messages = useQuery({
    queryKey: ["admin-count", "messages"],
    queryFn: () => api<Paginated<SentCartMessage> | SentCartMessage[]>(`/messages/?page_size=1`),
    retry: false,
  });

  const pc = products.data?.count ?? 0;
  const bc = Array.isArray(brands.data)
    ? brands.data.length
    : ((brands.data as Paginated<Brand> | undefined)?.count ?? 0);
  const cc = Array.isArray(customers.data)
    ? customers.data.length
    : ((customers.data as Paginated<Customer> | undefined)?.count ?? 0);
  const oc = Array.isArray(orders.data)
    ? orders.data.length
    : ((orders.data as Paginated<Order> | undefined)?.count ?? 0);
  const mc = Array.isArray(messages.data)
    ? messages.data.length
    : ((messages.data as Paginated<SentCartMessage> | undefined)?.count ?? 0);

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
      <StatCard label="Products" value={pc} loading={products.isLoading} />
      <StatCard label="Brands" value={bc} loading={brands.isLoading} />
      <StatCard
        label="Customers"
        value={cc}
        loading={customers.isLoading}
        error={customers.isError}
      />
      <StatCard label="Orders" value={oc} loading={orders.isLoading} error={orders.isError} />
      <StatCard label="Messages" value={mc} loading={messages.isLoading} error={messages.isError} />
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  error,
}: {
  label: string;
  value: number;
  loading?: boolean;
  error?: boolean;
}) {
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

const inputCls =
  "w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function TableShell({
  columns,
  loading,
  error,
  empty,
  children,
}: {
  columns: string[];
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                Loading…
              </td>
            </tr>
          )}
          {error && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-destructive">
                Failed to load.
              </td>
            </tr>
          )}
          {!loading && !error && empty && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                Nothing here.
              </td>
            </tr>
          )}
          {children}
        </tbody>
      </table>
    </div>
  );
}

function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>;
}

function PrimaryBtn({
  onClick,
  children,
  type = "button",
  disabled,
}: {
  onClick?: () => void;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-60 hover:brightness-110"
    >
      {children}
    </button>
  );
}

function GhostBtn({
  onClick,
  children,
  danger,
  disabled,
}: {
  onClick?: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold uppercase tracking-widest disabled:opacity-40 ${
        danger
          ? "border-destructive/40 text-destructive hover:bg-destructive/10"
          : "border-border text-muted-foreground hover:bg-surface hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl uppercase">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
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

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 mt-5 border-b border-border pb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </div>
  );
}

function confirmDelete(name: string) {
  return typeof window !== "undefined" && window.confirm(`Delete ${name}? This cannot be undone.`);
}

function StockBadge({ n }: { n: number }) {
  if (n === 0)
    return (
      <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
        Out
      </span>
    );
  if (n < 10)
    return (
      <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-500">
        Low ({n})
      </span>
    );
  return (
    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500">
      {n}
    </span>
  );
}

function PaymentBadge({ status }: { status?: string }) {
  if (status === "C")
    return (
      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500">
        Complete
      </span>
    );
  if (status === "F")
    return (
      <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
        Failed
      </span>
    );
  return (
    <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-500">
      Pending
    </span>
  );
}

function useCrud<T>(resource: string, queryKey: unknown[]) {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["admin-count"] });
    // Invalidate all frontend caches so changes appear immediately without a page refresh
    if (resource === "productsBrand") {
      qc.invalidateQueries({ queryKey: ["brands"] });
      qc.invalidateQueries({ queryKey: ["home-brands"] });
    }
    if (resource === "productsCategories") {
      qc.invalidateQueries({ queryKey: ["cats"] });
    }
    if (resource === "products") {
      // ["products", search] — invalidate all product queries regardless of search params
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["featured-products"] });
    }
  };
  const create = useMutation({
    mutationFn: (data: Partial<T>) =>
      api<T>(`/${resource}/`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: inv,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<T> }) =>
      api<T>(`/${resource}/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: inv,
  });
  const remove = useMutation({
    mutationFn: (id: number | string) => api<void>(`/${resource}/${id}/`, { method: "DELETE" }),
    onSuccess: inv,
  });
  return { create, update, remove };
}

// ---------------------------------------------------------------------------
// Searchable select dropdown
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
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => String(o.id) === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function h(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded border bg-background px-3 py-2 text-sm outline-none transition
          ${open ? "border-primary" : "border-border hover:border-primary/60"}
          ${required && !value ? "border-destructive/60" : ""}`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {loading ? "Loading…" : selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
              }}
              className="rounded p-0.5 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-card shadow-xl">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
            )}
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(String(o.id));
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface ${String(o.id) === value ? "bg-primary/10 text-primary" : ""}`}
                >
                  {String(o.id) === value ? (
                    <Check className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <span className="w-3.5" />
                  )}
                  {o.label}
                  {o.sub && <span className="ml-1 text-xs text-muted-foreground">({o.sub})</span>}
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
// BRANDS — list_display: name, tyre_count, created_at | search | slug
// ---------------------------------------------------------------------------

function BrandsTable() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Brand | null>(null);
  const [creating, setCreating] = useState(false);
  const [logoUploadFor, setLogoUploadFor] = useState<Brand | null>(null);

  const q = useQuery({
    queryKey: ["admin-brands", search],
    queryFn: () =>
      api<Paginated<Brand> | Brand[]>(`/productsBrand/`, {
        params: { search: search || undefined },
      }),
  });
  const qc = useQueryClient();
  const crud = useCrud<Brand>("productsBrand", ["admin-brands"]);
  const rows = Array.isArray(q.data) ? q.data : (q.data?.results ?? []);

  // Upload logo for an existing brand via multipart PATCH
  async function uploadLogo(brand: Brand, file: File) {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("khal.admin.token") : null;
    const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const apiBase = (
      (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api"
    ).replace(/\/$/, "");
    const fd = new FormData();
    fd.append("name", brand.name);
    fd.append("logo", file);
    const res = await fetch(`${apiBase}/productsBrand/${brand.id}/`, {
      method: "PATCH",
      headers: auth,
      body: fd,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`${res.status} — ${t}`);
    }
    qc.invalidateQueries({ queryKey: ["admin-brands"] });
    qc.invalidateQueries({ queryKey: ["brands"] });
    qc.invalidateQueries({ queryKey: ["home-brands"] });
  }

  return (
    <>
      <Toolbar>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brands…"
          className="w-full max-w-xs rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="ml-auto">
          <PrimaryBtn onClick={() => setCreating(true)}>
            <Plus className="h-3 w-3" />
            New brand
          </PrimaryBtn>
        </div>
      </Toolbar>

      <TableShell
        columns={["#", "Logo", "Name", "Products", ""]}
        loading={q.isLoading}
        error={q.isError}
        empty={rows.length === 0}
      >
        {rows.map((b) => (
          <tr key={b.id} className="border-t border-border hover:bg-surface/50">
            <td className="px-4 py-2 text-xs text-muted-foreground">#{b.id}</td>
            <td className="px-4 py-2">
              {b.logo ? (
                <img
                  src={mediaUrl(b.logo) ?? b.logo}
                  alt={b.name}
                  className="h-10 w-10 rounded border border-border object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-border bg-surface text-[10px] text-muted-foreground">
                  —
                </div>
              )}
            </td>
            <td className="px-4 py-2 font-semibold">{b.name}</td>
            <td className="px-4 py-2">{b.products_count ?? "—"}</td>
            <td className="px-4 py-2">
              <div className="flex justify-end gap-1.5">
                <GhostBtn onClick={() => setLogoUploadFor(b)}>
                  <Upload className="h-3 w-3" /> Logo
                </GhostBtn>
                <GhostBtn onClick={() => setEditing(b)}>
                  <Pencil className="h-3 w-3" />
                </GhostBtn>
                <GhostBtn
                  danger
                  onClick={() => {
                    if (confirmDelete(`"${b.name}"`)) crud.remove.mutate(b.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </GhostBtn>
              </div>
            </td>
          </tr>
        ))}
      </TableShell>

      {/* Create — name only */}
      {creating && (
        <BrandNameModal
          title="New brand"
          initial=""
          onClose={() => setCreating(false)}
          onSubmit={async (name) => {
            await crud.create.mutateAsync({ name } as Partial<Brand>);
            setCreating(false);
          }}
        />
      )}

      {/* Edit — name only */}
      {editing && (
        <BrandNameModal
          title={`Edit brand #${editing.id}`}
          initial={editing.name}
          onClose={() => setEditing(null)}
          onSubmit={async (name) => {
            await crud.update.mutateAsync({ id: editing!.id, data: { name } as Partial<Brand> });
            setEditing(null);
          }}
        />
      )}

      {/* Logo upload */}
      {logoUploadFor && (
        <BrandLogoModal
          brand={logoUploadFor}
          onClose={() => setLogoUploadFor(null)}
          onUpload={async (file) => {
            await uploadLogo(logoUploadFor, file);
            setLogoUploadFor(null);
          }}
        />
      )}
    </>
  );
}

// ── Brand name-only modal ─────────────────────────────────────────────────

function BrandNameModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input
            autoFocus
            className={inputCls}
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        {error && (
          <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </PrimaryBtn>
        </div>
      </form>
    </Modal>
  );
}

// ── Brand logo upload modal ───────────────────────────────────────────────

function BrandLogoModal({
  brand,
  onClose,
  onUpload,
}: {
  brand: Brand;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(mediaUrl(brand.logo) ?? brand.logo ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(files: FileList | null) {
    if (!files?.length) return;
    setFile(files[0]);
    setPreview(URL.createObjectURL(files[0]));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select an image first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Logo — ${brand.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          {preview ? (
            <img
              src={preview}
              alt="logo preview"
              className="h-32 w-32 rounded-lg border border-border object-contain"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface text-sm text-muted-foreground">
              No logo
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary transition"
          >
            <Upload className="h-4 w-4" /> {file ? "Change image" : "Select image"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files)}
          />
          <p className="text-xs text-muted-foreground">JPG, PNG or WEBP recommended</p>
        </div>
        {error && (
          <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn type="submit" disabled={busy || !file}>
            {busy ? "Uploading…" : "Upload logo"}
          </PrimaryBtn>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// CATEGORIES — same structure as brands
// ---------------------------------------------------------------------------

function CategoriesTable() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const q = useQuery({
    queryKey: ["admin-categories", search],
    queryFn: () =>
      api<Paginated<Category> | Category[]>(`/productsCategories/`, {
        params: { search: search || undefined },
      }),
  });
  const crud = useCrud<Category>("productsCategories", ["admin-categories"]);
  const rows = Array.isArray(q.data) ? q.data : (q.data?.results ?? []);

  return (
    <>
      <Toolbar>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories…"
          className="w-full max-w-xs rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="ml-auto">
          <PrimaryBtn onClick={() => setCreating(true)}>
            <Plus className="h-3 w-3" />
            New category
          </PrimaryBtn>
        </div>
      </Toolbar>
      <TableShell
        columns={["#", "Name", "Slug", "Products", "Created", ""]}
        loading={q.isLoading}
        error={q.isError}
        empty={rows.length === 0}
      >
        {rows.map((c) => (
          <tr key={c.id} className="border-t border-border hover:bg-surface/50">
            <td className="px-4 py-2 text-xs text-muted-foreground">#{c.id}</td>
            <td className="px-4 py-2 font-semibold">{c.name}</td>
            <td className="px-4 py-2 text-xs text-muted-foreground">{c.slug ?? "—"}</td>
            <td className="px-4 py-2">{c.products_count ?? "—"}</td>
            <td className="px-4 py-2 text-xs text-muted-foreground">
              {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
            </td>
            <td className="px-4 py-2">
              <div className="flex justify-end gap-1.5">
                <GhostBtn onClick={() => setEditing(c)}>
                  <Pencil className="h-3 w-3" />
                </GhostBtn>
                <GhostBtn
                  danger
                  onClick={() => {
                    if (confirmDelete(`"${c.name}"`)) crud.remove.mutate(c.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </GhostBtn>
              </div>
            </td>
          </tr>
        ))}
      </TableShell>
      {creating && (
        <NameSlugModal
          title="New category"
          initial={{ name: "", slug: "" }}
          onClose={() => setCreating(false)}
          onSubmit={async (d) => {
            await crud.create.mutateAsync(d as Partial<Category>);
            setCreating(false);
          }}
        />
      )}
      {editing && (
        <NameSlugModal
          title={`Edit category #${editing.id}`}
          initial={{ name: editing.name, slug: editing.slug ?? "" }}
          onClose={() => setEditing(null)}
          onSubmit={async (d) => {
            await crud.update.mutateAsync({ id: editing.id, data: d as Partial<Category> });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

// Shared name+slug form modal used by both brands and categories
function NameSlugModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: { name: string; slug: string };
  onClose: () => void;
  onSubmit: (d: { name: string; slug: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  function autoSlug(n: string) {
    return n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name, slug: slug || autoSlug(name) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input
            autoFocus
            className={inputCls}
            value={name}
            required
            onChange={(e) => {
              setName(e.target.value);
              if (!initial.slug) setSlug(autoSlug(e.target.value));
            }}
          />
        </Field>
        <Field label="Slug">
          <input
            className={inputCls}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-generated"
          />
        </Field>
        {error && (
          <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </PrimaryBtn>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// PRODUCTS — fieldsets: Basic info | Specifications | Pricing & stock | Details
//            inlines: ProductImageInline + ReviewInline
// ---------------------------------------------------------------------------

type ProductFormState = {
  model_name: string;
  brand_id: string;
  category_id: string;
  tire_size: string;
  is_active: boolean;
  load_index: string;
  speed_rating: string;
  price: string;
  inventory: string;
  description: string;
};

const emptyProduct: ProductFormState = {
  model_name: "",
  brand_id: "",
  category_id: "",
  tire_size: "",
  is_active: true,
  load_index: "",
  speed_rating: "",
  price: "",
  inventory: "0",
  description: "",
};

function ProductsTable() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [imagesFor, setImagesFor] = useState<Product | null>(null);

  const q = useQuery({
    queryKey: ["admin-products", search, brandFilter, categoryFilter, stockFilter],
    queryFn: () =>
      api<Paginated<Product>>(`/products/`, {
        params: {
          ordering: "-id",
          search: search || undefined,
          brand: brandFilter || undefined,
          category: categoryFilter || undefined,
          page_size: 100,
        },
      }),
  });
  const brandsQ = useQuery({
    queryKey: ["brands"],
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`),
  });
  const catsQ = useQuery({
    queryKey: ["cats"],
    queryFn: () => api<Paginated<Category> | Category[]>(`/productsCategories/`),
  });
  const crud = useCrud<Product>("products", ["admin-products"]);

  let rows = q.data?.results ?? [];
  if (stockFilter === "out") rows = rows.filter((p) => p.inventory === 0);
  else if (stockFilter === "low") rows = rows.filter((p) => p.inventory > 0 && p.inventory < 10);
  else if (stockFilter === "in") rows = rows.filter((p) => p.inventory >= 10);

  const brandList = Array.isArray(brandsQ.data) ? brandsQ.data : (brandsQ.data?.results ?? []);
  const catList = Array.isArray(catsQ.data) ? catsQ.data : (catsQ.data?.results ?? []);

  return (
    <>
      <Toolbar>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search model, brand…"
          className="w-full max-w-xs rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">All brands</option>
          {brandList.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">All categories</option>
          {catList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">All stock</option>
          <option value="in">In stock</option>
          <option value="low">Low (&lt;10)</option>
          <option value="out">Out of stock</option>
        </select>
        <div className="ml-auto">
          <PrimaryBtn onClick={() => setCreating(true)}>
            <Plus className="h-3 w-3" />
            New product
          </PrimaryBtn>
        </div>
      </Toolbar>

      <TableShell
        columns={[
          "#",
          "Image",
          "Model",
          "Brand",
          "Category",
          "Size",
          "Load / Speed",
          "Price",
          "Stock",
          "Active",
          "",
        ]}
        loading={q.isLoading}
        error={q.isError}
        empty={rows.length === 0}
      >
        {rows.map((p) => {
          const img = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
          return (
            <tr key={p.id} className="border-t border-border hover:bg-surface/50">
              <td className="px-4 py-2 text-xs text-muted-foreground">#{p.id}</td>
              <td className="px-4 py-2">
                {img ? (
                  <img
                    src={mediaUrl(img.image) ?? img.image}
                    alt=""
                    className="h-10 w-10 rounded border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-surface">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </td>
              <td className="px-4 py-2 font-semibold">{p.model_name}</td>
              <td className="px-4 py-2">{p.brand}</td>
              <td className="px-4 py-2">{p.category}</td>
              <td className="px-4 py-2 text-xs font-mono">{p.tire_size}</td>
              <td className="px-4 py-2 text-xs">
                {p.load_index} {p.speed_rating}
              </td>
              <td className="px-4 py-2 font-display text-primary">₦{p.price}</td>
              <td className="px-4 py-2">
                <StockBadge n={p.inventory} />
              </td>
              <td className="px-4 py-2">
                <span
                  className={`text-xs font-semibold ${p.is_active !== false ? "text-emerald-500" : "text-muted-foreground"}`}
                >
                  {p.is_active !== false ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1.5">
                  <GhostBtn onClick={() => setImagesFor(p)}>
                    <ImageIcon className="h-3 w-3" /> {p.images?.length ?? 0}
                  </GhostBtn>
                  <GhostBtn onClick={() => setEditing(p)}>
                    <Pencil className="h-3 w-3" />
                  </GhostBtn>
                  <GhostBtn
                    danger
                    onClick={() => {
                      if (confirmDelete(`"${p.model_name}"`)) crud.remove.mutate(p.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </GhostBtn>
                </div>
              </td>
            </tr>
          );
        })}
      </TableShell>

      {creating && (
        <ProductFormModal
          title="New product"
          initial={emptyProduct}
          onClose={() => setCreating(false)}
          onSubmit={async (data) => {
            await crud.create.mutateAsync(data);
            setCreating(false);
          }}
        />
      )}
      {editing && (
        <ProductFormModal
          title={`Edit #${editing.id} — ${editing.model_name}`}
          initial={{
            model_name: editing.model_name,
            brand_id: String(editing.brand_id ?? ""),
            category_id: String(editing.category_id ?? ""),
            tire_size: editing.tire_size,
            is_active: editing.is_active !== false,
            load_index: String(editing.load_index),
            speed_rating: editing.speed_rating,
            price: String(editing.price),
            inventory: String(editing.inventory),
            description: editing.description,
          }}
          brandName={String(editing.brand)}
          categoryName={String(editing.category)}
          productId={editing.id}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            await crud.update.mutateAsync({ id: editing.id, data });
            setEditing(null);
          }}
        />
      )}
      {imagesFor && (
        <ProductImagesModal
          product={imagesFor}
          onClose={() => setImagesFor(null)}
          onDone={() => {
            setImagesFor(null);
            q.refetch();
          }}
        />
      )}
    </>
  );
}

function ProductFormModal({
  title,
  initial,
  brandName,
  categoryName,
  productId,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: ProductFormState;
  brandName?: string;
  categoryName?: string;
  productId?: number;
  onClose: () => void;
  onSubmit: (data: Partial<Product>) => Promise<void>;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brandsQ = useQuery({
    queryKey: ["brands"],
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/productsBrand/`),
  });
  const catsQ = useQuery({
    queryKey: ["cats"],
    queryFn: () => api<Paginated<Category> | Category[]>(`/productsCategories/`),
  });
  const brandList = Array.isArray(brandsQ.data) ? brandsQ.data : (brandsQ.data?.results ?? []);
  const catList = Array.isArray(catsQ.data) ? catsQ.data : (catsQ.data?.results ?? []);

  // Existing reviews when editing
  const reviewsQ = useQuery({
    queryKey: ["admin-reviews-inline", productId],
    queryFn: () => api<Review[] | { results: Review[] }>(`/products/${productId}/reviews/`),
    enabled: !!productId,
  });
  const existingReviews: Review[] = Array.isArray(reviewsQ.data)
    ? reviewsQ.data
    : ((reviewsQ.data as { results: Review[] } | undefined)?.results ?? []);

  const deleteReview = useMutation({
    mutationFn: (rid: number) =>
      api<void>(`/products/${productId}/reviews/${rid}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews-inline", productId] }),
  });

  // Pre-populate brand/category when editing by name
  useEffect(() => {
    if (brandName && !form.brand_id && brandList.length > 0) {
      const f = brandList.find((b) => b.name === brandName);
      if (f) setForm((prev) => ({ ...prev, brand_id: String(f.id) }));
    }
  }, [brandList, brandName, form.brand_id]);
  useEffect(() => {
    if (categoryName && !form.category_id && catList.length > 0) {
      const f = catList.find((c) => c.name === categoryName);
      if (f) setForm((prev) => ({ ...prev, category_id: String(f.id) }));
    }
  }, [catList, categoryName, form.category_id]);

  function set<K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const brandIdNum = Number(form.brand_id);
    const catIdNum = Number(form.category_id);
    if (!brandIdNum) {
      setError("Please select a brand.");
      setBusy(false);
      return;
    }
    if (!catIdNum) {
      setError("Please select a category.");
      setBusy(false);
      return;
    }
    try {
      await onSubmit({
        model_name: form.model_name,
        brand_id: brandIdNum,
        category_id: catIdNum,
        tire_size: form.tire_size,
        is_active: form.is_active,
        load_index: Number(form.load_index),
        speed_rating: form.speed_rating,
        price: form.price,
        inventory: Number(form.inventory),
        description: form.description,
      } as Partial<Product>);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-3">
        {/* ── Fieldset: Basic info ── */}
        <SectionTitle>Basic info</SectionTitle>
        <Field label="Model name">
          <input
            className={inputCls}
            value={form.model_name}
            onChange={(e) => set("model_name", e.target.value)}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <SearchSelect
              options={brandList.map((b) => ({ id: b.id, label: b.name }))}
              value={form.brand_id}
              onChange={(v) => set("brand_id", v)}
              placeholder="Select brand…"
              required
              loading={brandsQ.isLoading}
            />
          </Field>
          <Field label="Category">
            <SearchSelect
              options={catList.map((c) => ({ id: c.id, label: c.name }))}
              value={form.category_id}
              onChange={(v) => set("category_id", v)}
              placeholder="Select category…"
              required
              loading={catsQ.isLoading}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tyre size">
            <input
              className={inputCls}
              value={form.tire_size}
              onChange={(e) => set("tire_size", e.target.value)}
              required
              placeholder="e.g. 205/55 R16"
            />
          </Field>
          <Field label="Active">
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                className="rounded"
              />
              Visible on storefront
            </label>
          </Field>
        </div>

        {/* ── Fieldset: Specifications ── */}
        <SectionTitle>Specifications</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Load index">
            <input
              type="number"
              className={inputCls}
              value={form.load_index}
              onChange={(e) => set("load_index", e.target.value)}
              required
            />
          </Field>
          <Field label="Speed rating">
            <input
              className={inputCls}
              value={form.speed_rating}
              onChange={(e) => set("speed_rating", e.target.value)}
              required
              placeholder="e.g. H"
              maxLength={2}
            />
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Single letter or two-char code (max 2). e.g. H, V, W, ZR
            </span>
          </Field>
        </div>

        {/* ── Fieldset: Pricing & stock ── */}
        <SectionTitle>Pricing & stock</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₦)">
            <input
              className={inputCls}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              required
              placeholder="0.00"
            />
          </Field>
          <Field label="Inventory">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.inventory}
              onChange={(e) => set("inventory", e.target.value)}
              required
            />
          </Field>
        </div>

        {/* ── Fieldset: Details ── */}
        <SectionTitle>Details</SectionTitle>
        <Field label="Description">
          <textarea
            rows={3}
            className={inputCls}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save product"}
          </PrimaryBtn>
        </div>
      </form>

      {/* ── Inline: Reviews (TabularInline) ── */}
      {productId && (
        <div className="mt-5 border-t border-border pt-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Reviews
          </span>
          {reviewsQ.isLoading && <p className="mt-2 text-xs text-muted-foreground">Loading…</p>}
          {existingReviews.length === 0 && !reviewsQ.isLoading && (
            <p className="mt-2 text-xs text-muted-foreground">No reviews yet.</p>
          )}
          {existingReviews.length > 0 && (
            <table className="mt-2 w-full text-xs">
              <thead className="text-muted-foreground uppercase tracking-widest">
                <tr>
                  <th className="pb-1 text-left">Name</th>
                  <th className="pb-1 text-left">Review</th>
                  <th className="pb-1 text-left">Date</th>
                  <th className="pb-1" />
                </tr>
              </thead>
              <tbody>
                {existingReviews.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-semibold">{r.name}</td>
                    <td className="max-w-xs truncate py-1.5 pr-3 text-muted-foreground">
                      {r.description}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-1.5 text-right">
                      <GhostBtn
                        danger
                        onClick={() => {
                          if (confirmDelete(`review by "${r.name}"`)) deleteReview.mutate(r.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </GhostBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Product images standalone modal ──────────────────────────────────────

function ProductImagesModal({
  product,
  onClose,
  onDone,
}: {
  product: Product;
  onClose: () => void;
  onDone: () => void;
}) {
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
    mutationFn: (imgId: number) =>
      api<void>(`/products/${product.id}/images/${imgId}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-images", product.id] }),
  });
  const setPrimary = useMutation({
    mutationFn: (imgId: number) =>
      api<ProductImage>(`/products/${product.id}/images/${imgId}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_primary: true }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-images", product.id] }),
  });

  async function uploadFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    setUploadError(null);
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("khal.admin.token") : null;
    const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("image", file);
        fd.append("is_primary", images.length === 0 ? "true" : "false");
        const origin = API_URL.replace(/\/api\/?$/, "");
        const res = await fetch(`${origin}/api/products/${product.id}/images/`, {
          method: "POST",
          headers: auth,
          body: fd,
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`${res.status} — ${t}`);
        }
      }
      await qc.invalidateQueries({ queryKey: ["product-images", product.id] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Modal title={`Images — ${product.model_name}`} onClose={onClose} wide>
      <div className="mb-4 rounded-lg border-2 border-dashed border-border p-4 text-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-60 hover:brightness-110"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload images"}
        </button>
        <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP — multiple allowed</p>
        {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
      </div>
      {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!q.isLoading && images.length === 0 && (
        <p className="text-sm text-muted-foreground">No images yet.</p>
      )}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((im) => (
          <div key={im.id} className="group relative">
            <img
              src={mediaUrl(im.image) ?? im.image}
              alt=""
              className="aspect-square w-full rounded-lg border border-border object-cover"
            />
            {im.is_primary && (
              <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                Primary
              </span>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-black/50 opacity-0 transition group-hover:opacity-100">
              {!im.is_primary && (
                <button
                  onClick={() => setPrimary.mutate(im.id)}
                  className="rounded bg-white/20 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-white/40"
                >
                  Set primary
                </button>
              )}
              <button
                onClick={() => {
                  if (confirmDelete("this image")) deleteImg.mutate(im.id);
                }}
                className="rounded bg-destructive/80 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-destructive"
              >
                <Trash2 className="inline h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <PrimaryBtn onClick={onDone}>Done</PrimaryBtn>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// IMAGES tab — standalone product image manager
// ---------------------------------------------------------------------------

function ImagesTab() {
  const [productId, setProductId] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const productsQ = useQuery({
    queryKey: ["admin-products-for-images"],
    queryFn: () =>
      api<Paginated<Product>>(`/products/`, { params: { page_size: 200, ordering: "model_name" } }),
  });
  const rows = productsQ.data?.results ?? [];

  function pick(id: string) {
    setProductId(id);
    setSelected(rows.find((p) => String(p.id) === id) ?? null);
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          Select product
        </label>
        <select
          value={productId}
          onChange={(e) => pick(e.target.value)}
          className={`mt-1 ${inputCls}`}
        >
          <option value="">— choose a product —</option>
          {rows.map((p) => (
            <option key={p.id} value={p.id}>
              {p.model_name} ({p.brand})
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <ProductImagesModal
          product={selected}
          onClose={() => setSelected(null)}
          onDone={() => setSelected(null)}
        />
      )}
      {!selected && !productId && (
        <div className="rounded-lg border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Select a product above to upload, remove, or set primary images.
        </div>
      )}
      {!selected && productId && (
        <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <PrimaryBtn
            onClick={() => {
              const p = rows.find((r) => String(r.id) === productId);
              if (p) setSelected(p);
            }}
          >
            <ImageIcon className="h-3 w-3" /> Manage images
          </PrimaryBtn>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CUSTOMERS — list_display: name, membership, phone, birth_date
//             inline: AddressInline
// ---------------------------------------------------------------------------

function CustomersTable() {
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Customer | null>(null);

  const q = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: () =>
      api<Paginated<Customer> | Customer[]>(`/customers/`, {
        params: { search: search || undefined },
      }),
    retry: false,
  });
  const rows = Array.isArray(q.data) ? q.data : (q.data?.results ?? []);

  function customerName(c: Customer) {
    if (!c.user) return `Customer #${c.id}`;
    if (typeof c.user === "object") {
      const name = [c.user.first_name, c.user.last_name].filter(Boolean).join(" ");
      return name || c.user.username || c.user.email || `#${c.user.id}`;
    }
    return `#${c.user}`;
  }

  return (
    <>
      <Toolbar>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="w-full max-w-xs rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </Toolbar>
      <TableShell
        columns={["#", "Name", "Email", "Phone", "Membership", "Birth date", ""]}
        loading={q.isLoading}
        error={q.isError}
        empty={rows.length === 0}
      >
        {rows.map((c) => {
          const email = typeof c.user === "object" ? c.user?.email : undefined;
          const membership = c.membership ?? "—";
          return (
            <tr key={c.id} className="border-t border-border hover:bg-surface/50">
              <td className="px-4 py-2 text-xs text-muted-foreground">#{c.id}</td>
              <td className="px-4 py-2 font-semibold">{customerName(c)}</td>
              <td className="px-4 py-2 text-sm text-muted-foreground">{email ?? "—"}</td>
              <td className="px-4 py-2 text-sm">{c.phone_number ?? "—"}</td>
              <td className="px-4 py-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase text-primary">
                  {membership}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{c.birth_date ?? "—"}</td>
              <td className="px-4 py-2">
                <div className="flex justify-end">
                  <GhostBtn onClick={() => setViewing(c)}>
                    <ChevronRight className="h-3 w-3" /> Addresses
                  </GhostBtn>
                </div>
              </td>
            </tr>
          );
        })}
      </TableShell>
      {viewing && <CustomerAddressesModal customer={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

// ── AddressInline ─────────────────────────────────────────────────────────

function CustomerAddressesModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  function customerName(c: Customer) {
    if (!c.user) return `Customer #${c.id}`;
    if (typeof c.user === "object")
      return [c.user.first_name, c.user.last_name].filter(Boolean).join(" ") || `#${c.user.id}`;
    return `#${c.user}`;
  }

  const q = useQuery({
    queryKey: ["customer-addresses", customer.id],
    queryFn: () => api<Paginated<Address> | Address[]>(`/customers/${customer.id}/addresses/`),
    retry: false,
  });
  const rows = Array.isArray(q.data) ? q.data : (q.data?.results ?? []);

  const remove = useMutation({
    mutationFn: (id: number) =>
      api<void>(`/customers/${customer.id}/addresses/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-addresses", customer.id] }),
  });

  return (
    <Modal title={`Addresses — ${customerName(customer)}`} onClose={onClose} wide>
      {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {q.isError && <p className="text-sm text-destructive">Could not load addresses.</p>}
      {!q.isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No addresses on file.</p>
      )}
      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="pb-2 text-left">Street</th>
              <th className="pb-2 text-left">City</th>
              <th className="pb-2 text-left">Zip</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="py-2 pr-4">{a.street}</td>
                <td className="py-2 pr-4">{a.city}</td>
                <td className="py-2 pr-4 text-muted-foreground">{a.zip ?? "—"}</td>
                <td className="py-2 text-right">
                  <GhostBtn
                    danger
                    onClick={() => {
                      if (confirmDelete(`address "${a.street}"`)) remove.mutate(a.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </GhostBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-4 flex justify-end">
        <GhostBtn onClick={onClose}>Close</GhostBtn>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// ORDERS — list_display: id, customer, payment_status, placed_at,
//                        item_count, order_total
//          list_filter: payment_status, placed_at
//          inline: OrderItemInline
// ---------------------------------------------------------------------------

function OrdersTable() {
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const q = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: () =>
      api<Paginated<Order> | Order[]>(`/orders/`, {
        params: { payment_status: statusFilter || undefined },
      }),
    retry: false,
  });
  const crud = useCrud<Order>("orders", ["admin-orders"]);
  const rows = Array.isArray(q.data) ? q.data : (q.data?.results ?? []);

  function customerLabel(o: Order) {
    if (!o.customer) return "—";
    if (typeof o.customer === "object")
      return (
        [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ") ||
        `#${o.customer.id}`
      );
    return `#${o.customer}`;
  }

  function orderTotal(items: OrderItem[]) {
    return items.reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0);
  }

  return (
    <>
      <Toolbar>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          <option value="P">Pending</option>
          <option value="C">Complete</option>
          <option value="F">Failed</option>
        </select>
      </Toolbar>
      <TableShell
        columns={["#", "Customer", "Status", "Items", "Total", "Placed at", ""]}
        loading={q.isLoading}
        error={q.isError}
        empty={rows.length === 0}
      >
        {rows.map((o) => {
          const items = o.items ?? [];
          const isOpen = expanded === o.id;
          return (
            <>
              <tr key={o.id} className="border-t border-border hover:bg-surface/50">
                <td className="px-4 py-2 text-xs text-muted-foreground">#{o.id}</td>
                <td className="px-4 py-2 font-semibold">{customerLabel(o)}</td>
                <td className="px-4 py-2">
                  <select
                    value={o.payment_status ?? "P"}
                    onChange={(e) =>
                      crud.update.mutate({
                        id: o.id,
                        data: { payment_status: e.target.value } as Partial<Order>,
                      })
                    }
                    className="rounded border border-border bg-background px-2 py-1 text-xs uppercase"
                  >
                    <option value="P">Pending</option>
                    <option value="C">Complete</option>
                    <option value="F">Failed</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                    className="rounded border border-border px-2 py-0.5 text-xs hover:border-primary hover:text-primary"
                  >
                    {items.length} {isOpen ? "▲" : "▼"}
                  </button>
                </td>
                <td className="px-4 py-2 font-display text-primary">
                  ₦{orderTotal(items).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {o.placed_at ? new Date(o.placed_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2">
                  <GhostBtn
                    danger
                    onClick={() => {
                      if (confirmDelete(`order #${o.id}`)) crud.remove.mutate(o.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </GhostBtn>
                </td>
              </tr>
              {isOpen && (
                <tr key={`${o.id}-items`} className="border-t border-border bg-surface/30">
                  <td colSpan={7} className="px-6 py-3">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No items.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="text-muted-foreground uppercase tracking-widest">
                          <tr>
                            <th className="pb-1 text-left">Product</th>
                            <th className="pb-1 text-right">Qty</th>
                            <th className="pb-1 text-right">Unit price</th>
                            <th className="pb-1 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(items as OrderItem[]).map((it) => (
                            <tr key={it.id}>
                              <td className="py-0.5">
                                {it.product?.model_name ?? `Item #${it.id}`}
                              </td>
                              <td className="py-0.5 text-right">{it.quantity}</td>
                              <td className="py-0.5 text-right">
                                ₦{Number(it.unit_price).toFixed(2)}
                              </td>
                              <td className="py-0.5 text-right font-semibold">
                                ₦{(Number(it.unit_price) * it.quantity).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
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
// CARTS — list_display: id, created_at, item_count
//         inline: CartItemInline
// ---------------------------------------------------------------------------

function CartsTable() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin-carts"],
    queryFn: () => api<Paginated<Cart> | Cart[]>(`/cart/`),
    retry: false,
  });
  const crud = useCrud<Cart>("cart", ["admin-carts"]);
  const rows = Array.isArray(q.data) ? q.data : (q.data?.results ?? []);

  return (
    <TableShell
      columns={["Cart ID", "Items", "Total", "Created", ""]}
      loading={q.isLoading}
      error={q.isError}
      empty={rows.length === 0}
    >
      {rows.map((c) => {
        const isOpen = expanded === c.id;
        return (
          <>
            <tr key={c.id} className="border-t border-border hover:bg-surface/50">
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{c.id}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="rounded border border-border px-2 py-0.5 text-xs hover:border-primary hover:text-primary"
                >
                  {c.items?.length ?? 0} {isOpen ? "▲" : "▼"}
                </button>
              </td>
              <td className="px-4 py-2 font-display text-primary">
                ₦{Number(c.total_price ?? 0).toFixed(2)}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-2">
                <div className="flex justify-end">
                  <GhostBtn
                    danger
                    onClick={() => {
                      if (confirmDelete(`cart ${c.id}`)) crud.remove.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </GhostBtn>
                </div>
              </td>
            </tr>
            {isOpen && c.items && c.items.length > 0 && (
              <tr key={`${c.id}-items`} className="border-t border-border bg-surface/30">
                <td colSpan={5} className="px-6 py-3">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground uppercase tracking-widest">
                      <tr>
                        <th className="pb-1 text-left">Product</th>
                        <th className="pb-1 text-right">Qty</th>
                        <th className="pb-1 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.items.map((it: CartItem) => (
                        <tr key={it.id}>
                          <td className="py-0.5">{it.product?.model_name ?? `Item #${it.id}`}</td>
                          <td className="py-0.5 text-right">{it.quantity}</td>
                          <td className="py-0.5 text-right font-semibold">
                            ₦{Number(it.total_price ?? 0).toFixed(2)}
                          </td>
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
  );
}

// ---------------------------------------------------------------------------
// REVIEWS — list_display: product, name, date | search | list_filter: date
// ---------------------------------------------------------------------------

function ReviewsTable() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const productsQ = useQuery({
    queryKey: ["admin-products-for-reviews"],
    queryFn: () =>
      api<Paginated<Product>>(`/products/`, { params: { page_size: 200, ordering: "-id" } }),
  });
  const productList = productsQ.data?.results ?? [];

  // Filter products by search
  const filtered = search
    ? productList.filter(
        (p) =>
          p.model_name.toLowerCase().includes(search.toLowerCase()) ||
          p.brand.toLowerCase().includes(search.toLowerCase()),
      )
    : productList;

  return (
    <>
      <Toolbar>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product or brand…"
          className="w-full max-w-xs rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </Toolbar>
      <TableShell
        columns={["Product", "Reviewer", "Review", "Date", ""]}
        loading={productsQ.isLoading}
        error={productsQ.isError}
        empty={filtered.length === 0}
      >
        {filtered.map((p) => (
          <ProductReviewRows key={p.id} product={p} qc={qc} />
        ))}
      </TableShell>
    </>
  );
}

function ProductReviewRows({
  product,
  qc,
}: {
  product: Product;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const q = useQuery({
    queryKey: ["admin-reviews", product.id],
    queryFn: () => api<Review[] | { results: Review[] }>(`/products/${product.id}/reviews/`),
  });
  const rows: Review[] = Array.isArray(q.data)
    ? q.data
    : ((q.data as { results: Review[] } | undefined)?.results ?? []);
  const remove = useMutation({
    mutationFn: (id: number) =>
      api<void>(`/products/${product.id}/reviews/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews", product.id] }),
  });
  if (!q.isFetched || rows.length === 0) return null;
  return (
    <>
      {rows.map((r) => (
        <tr key={`${product.id}-${r.id}`} className="border-t border-border hover:bg-surface/50">
          <td className="px-4 py-2 font-semibold">{product.model_name}</td>
          <td className="px-4 py-2">{r.name}</td>
          <td className="max-w-xs truncate px-4 py-2 text-muted-foreground">{r.description}</td>
          <td className="px-4 py-2 text-xs text-muted-foreground">
            {r.date ? new Date(r.date).toLocaleDateString() : "—"}
          </td>
          <td className="px-4 py-2">
            <div className="flex justify-end">
              <GhostBtn
                danger
                onClick={() => {
                  if (confirmDelete(`review by "${r.name}"`)) remove.mutate(r.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </GhostBtn>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// MESSAGES — WhatsApp cart messages
// ---------------------------------------------------------------------------

function MessagesTable() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-messages"],
    queryFn: () => api<Paginated<SentCartMessage> | SentCartMessage[]>(`/messages/`),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/messages/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-messages"] }),
  });
  const rows = Array.isArray(q.data) ? q.data : (q.data?.results ?? []);

  return (
    <div className="space-y-3">
      {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {q.isError && <p className="text-sm text-destructive">Failed to load messages.</p>}
      {!q.isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      )}
      {rows.map((m) => (
        <div key={m.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-semibold">{m.contact_name}</div>
              <div className="text-xs text-muted-foreground">
                {m.contact_phone}
                {m.contact_email && ` · ${m.contact_email}`}
                {" · "}
                {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-display text-xl text-primary">
                ₦{Number(m.total_price).toFixed(2)}
              </div>
              <GhostBtn
                danger
                onClick={() => {
                  if (confirmDelete(`message from "${m.contact_name}"`)) remove.mutate(m.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </GhostBtn>
            </div>
          </div>
          {m.contact_note && <p className="mt-2 text-sm text-muted-foreground">{m.contact_note}</p>}
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background p-3 text-xs text-muted-foreground">
            {m.message_text}
          </pre>
          {m.whatsapp_url && (
            <a
              href={m.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-semibold uppercase tracking-widest text-primary hover:underline"
            >
              Open WhatsApp →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
