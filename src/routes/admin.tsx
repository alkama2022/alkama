import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  api,
  type Paginated,
  type Product,
  type Brand,
  type Category,
  type Review,
  type Cart,
  type SentCartMessage,
} from "@/lib/api";
import { login, logout, useAuth, type AuthUser } from "@/lib/auth";

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
// Superuser gate. Only authenticated superusers can access this page.
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
        setError("This account is not a superuser.");
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
        <p className="mt-1 text-sm text-muted-foreground">
          Superuser access only.
        </p>

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
      <p className="mt-2 text-muted-foreground">
        {user.username ? `${user.username}, you` : "You"} are signed in, but this area
        requires a Django <strong>superuser</strong>.
      </p>
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
// Admin shell (superuser only past this point)
// ---------------------------------------------------------------------------

type TabKey =
  | "products"
  | "brands"
  | "categories"
  | "reviews"
  | "customers"
  | "orders"
  | "carts"
  | "messages";

const TABS: { key: TabKey; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "brands", label: "Brands" },
  { key: "categories", label: "Categories" },
  { key: "reviews", label: "Reviews" },
  { key: "customers", label: "Customers" },
  { key: "orders", label: "Orders" },
  { key: "carts", label: "Carts" },
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
            Signed in as <strong>{user?.username || "superuser"}</strong> · Full CRUD access.
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
        {tab === "reviews" && <ReviewsTable />}
        {tab === "customers" && <CustomersTable />}
        {tab === "orders" && <OrdersTable />}
        {tab === "carts" && <CartsTable />}
        {tab === "messages" && <MessagesTable />}
      </div>
    </div>
  );
}

// ---------- Stats ----------

function StatsRow() {
  const products = useQuery({
    queryKey: ["admin-count", "products"],
    queryFn: () => api<Paginated<Product>>(`/products/?page_size=1`),
  });
  const brands = useQuery({
    queryKey: ["admin-count", "brands"],
    queryFn: () => api<Paginated<Brand> | Brand[]>(`/brands/`),
  });
  const orders = useQuery({
    queryKey: ["admin-count", "orders"],
    queryFn: () => api<Paginated<AdminOrder> | AdminOrder[]>(`/orders/?page_size=1`),
    retry: false,
  });
  const messages = useQuery({
    queryKey: ["admin-count", "messages"],
    queryFn: () => api<Paginated<SentCartMessage> | SentCartMessage[]>(`/messages/?page_size=1`),
    retry: false,
  });

  const productsCount = products.data?.count ?? products.data?.results?.length ?? 0;
  const brandsCount = Array.isArray(brands.data)
    ? brands.data.length
    : brands.data?.count ?? brands.data?.results?.length ?? 0;
  const ordersCount = Array.isArray(orders.data)
    ? orders.data.length
    : orders.data?.count ?? 0;
  const messagesCount = Array.isArray(messages.data)
    ? messages.data.length
    : messages.data?.count ?? 0;

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Products" value={productsCount} loading={products.isLoading} />
      <StatCard label="Brands" value={brandsCount} loading={brands.isLoading} />
      <StatCard label="Orders" value={ordersCount} loading={orders.isLoading} error={orders.isError} />
      <StatCard label="Messages" value={messagesCount} loading={messages.isLoading} error={messages.isError} />
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

// ---------- Shared UI ----------

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
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-muted-foreground">
                Loading…
              </td>
            </tr>
          )}
          {error && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-destructive">
                Failed to load.
              </td>
            </tr>
          )}
          {!loading && !error && empty && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-muted-foreground">
                Nothing to show.
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
      className="rounded bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function GhostBtn({
  onClick,
  children,
  danger,
}: {
  onClick?: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-2 py-1 text-xs font-semibold uppercase tracking-widest ${
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
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl uppercase">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function useCrud<T>(resource: string, queryKey: unknown[]) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["admin-count"] });
  };
  const create = useMutation({
    mutationFn: (data: Partial<T>) =>
      api<T>(`/${resource}/`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<T> }) =>
      api<T>(`/${resource}/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number | string) =>
      api<void>(`/${resource}/${id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

function confirmDelete(name: string): boolean {
  return typeof window !== "undefined" && window.confirm(`Delete ${name}? This cannot be undone.`);
}

// ---------- Products ----------

type ProductFormState = {
  model_name: string;
  brand: string;
  category: string;
  width: string;
  aspect_ratio: string;
  rim_diameter: string;
  load_index: string;
  speed_rating: string;
  price: string;
  inventory: string;
  description: string;
};

const emptyProduct: ProductFormState = {
  model_name: "",
  brand: "",
  category: "",
  width: "",
  aspect_ratio: "",
  rim_diameter: "",
  load_index: "",
  speed_rating: "",
  price: "",
  inventory: "0",
  description: "",
};

function ProductsTable() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const q = useQuery({
    queryKey: ["admin-products", search],
    queryFn: () =>
      api<Paginated<Product>>(`/products/`, {
        params: { ordering: "-id", search: search || undefined, page_size: 50 },
      }),
  });
  const crud = useCrud<Product>("products", ["admin-products"]);
  const rows = q.data?.results ?? [];

  return (
    <>
      <Toolbar>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full max-w-sm rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="ml-auto">
          <PrimaryBtn onClick={() => setCreating(true)}>+ New product</PrimaryBtn>
        </div>
      </Toolbar>
      <TableShell
        columns={["ID", "Model", "Brand", "Category", "Size", "Stock", "Price", ""]}
        loading={q.isLoading}
        error={q.isError}
        empty={rows.length === 0}
      >
        {rows.map((p) => (
          <tr key={p.id} className="border-t border-border">
            <td className="px-4 py-3 text-muted-foreground">#{p.id}</td>
            <td className="px-4 py-3 font-semibold">{p.model_name}</td>
            <td className="px-4 py-3">{p.brand}</td>
            <td className="px-4 py-3">{p.category}</td>
            <td className="px-4 py-3">
              {p.width}/{p.aspect_ratio} R{p.rim_diameter}
            </td>
            <td className="px-4 py-3">
              <StockBadge n={p.inventory} />
            </td>
            <td className="px-4 py-3 font-display text-primary">${p.price}</td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2">
                <GhostBtn onClick={() => setEditing(p)}>Edit</GhostBtn>
                <GhostBtn
                  danger
                  onClick={() => {
                    if (confirmDelete(`product "${p.model_name}"`)) crud.remove.mutate(p.id);
                  }}
                >
                  Delete
                </GhostBtn>
              </div>
            </td>
          </tr>
        ))}
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
          title={`Edit #${editing.id}`}
          initial={{
            model_name: editing.model_name,
            brand: editing.brand,
            category: editing.category,
            width: String(editing.width),
            aspect_ratio: String(editing.aspect_ratio),
            rim_diameter: String(editing.rim_diameter),
            load_index: String(editing.load_index),
            speed_rating: editing.speed_rating,
            price: String(editing.price),
            inventory: String(editing.inventory),
            description: editing.description,
          }}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            await crud.update.mutateAsync({ id: editing.id, data });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function ProductFormModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: ProductFormState;
  onClose: () => void;
  onSubmit: (data: Partial<Product>) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProductFormState>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        model_name: form.model_name,
        brand: form.brand,
        category: form.category,
        width: Number(form.width),
        aspect_ratio: Number(form.aspect_ratio),
        rim_diameter: Number(form.rim_diameter),
        load_index: Number(form.load_index),
        speed_rating: form.speed_rating,
        price: form.price,
        inventory: Number(form.inventory),
        description: form.description,
      } as Partial<Product>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Model name">
          <input className={inputCls} value={form.model_name} onChange={(e) => set("model_name", e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <input className={inputCls} value={form.brand} onChange={(e) => set("brand", e.target.value)} required />
          </Field>
          <Field label="Category">
            <input className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Width">
            <input type="number" className={inputCls} value={form.width} onChange={(e) => set("width", e.target.value)} required />
          </Field>
          <Field label="Aspect ratio">
            <input type="number" className={inputCls} value={form.aspect_ratio} onChange={(e) => set("aspect_ratio", e.target.value)} required />
          </Field>
          <Field label="Rim diameter">
            <input type="number" className={inputCls} value={form.rim_diameter} onChange={(e) => set("rim_diameter", e.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Load index">
            <input type="number" className={inputCls} value={form.load_index} onChange={(e) => set("load_index", e.target.value)} required />
          </Field>
          <Field label="Speed rating">
            <input className={inputCls} value={form.speed_rating} onChange={(e) => set("speed_rating", e.target.value)} required />
          </Field>
          <Field label="Inventory">
            <input type="number" className={inputCls} value={form.inventory} onChange={(e) => set("inventory", e.target.value)} required />
          </Field>
        </div>
        <Field label="Price">
          <input className={inputCls} value={form.price} onChange={(e) => set("price", e.target.value)} required />
        </Field>
        <Field label="Description">
          <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        {error && <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        </div>
      </form>
    </Modal>
  );
}

function StockBadge({ n }: { n: number }) {
  if (n === 0)
    return <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">Out</span>;
  if (n < 10)
    return <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-500">Low ({n})</span>;
  return <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500">{n}</span>;
}

// ---------- Simple name-only CRUD (Brands & Categories) ----------

function NameOnlyTable({
  resource,
  queryKey,
  label,
}: {
  resource: "brands" | "categories";
  queryKey: string;
  label: string;
}) {
  const q = useQuery({
    queryKey: [queryKey],
    queryFn: () => api<Paginated<Brand | Category> | (Brand | Category)[]>(`/${resource}/`),
  });
  const crud = useCrud<Brand | Category>(resource, [queryKey]);
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Brand | Category | null>(null);

  return (
    <>
      <Toolbar>
        <div className="ml-auto">
          <PrimaryBtn onClick={() => setCreating(true)}>+ New {label}</PrimaryBtn>
        </div>
      </Toolbar>
      <TableShell columns={["ID", "Name", "Products", ""]} loading={q.isLoading} error={q.isError} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="px-4 py-3 text-muted-foreground">#{r.id}</td>
            <td className="px-4 py-3 font-semibold">{r.name}</td>
            <td className="px-4 py-3">{r.products_count ?? "—"}</td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2">
                <GhostBtn onClick={() => setEditing(r)}>Edit</GhostBtn>
                <GhostBtn
                  danger
                  onClick={() => {
                    if (confirmDelete(`${label} "${r.name}"`)) crud.remove.mutate(r.id);
                  }}
                >
                  Delete
                </GhostBtn>
              </div>
            </td>
          </tr>
        ))}
      </TableShell>

      {creating && (
        <NameFormModal
          title={`New ${label}`}
          initial=""
          onClose={() => setCreating(false)}
          onSubmit={async (name) => {
            await crud.create.mutateAsync({ name } as Partial<Brand | Category>);
            setCreating(false);
          }}
        />
      )}
      {editing && (
        <NameFormModal
          title={`Edit ${label} #${editing.id}`}
          initial={editing.name}
          onClose={() => setEditing(null)}
          onSubmit={async (name) => {
            await crud.update.mutateAsync({ id: editing.id, data: { name } as Partial<Brand | Category> });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function NameFormModal({
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
          <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        {error && <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        </div>
      </form>
    </Modal>
  );
}

function BrandsTable() {
  return <NameOnlyTable resource="brands" queryKey="admin-brands" label="brand" />;
}

function CategoriesTable() {
  return <NameOnlyTable resource="categories" queryKey="admin-categories" label="category" />;
}

// ---------- Reviews ----------

type AdminReview = Review & { product?: number; date?: string };

function ReviewsTable() {
  const products = useQuery({
    queryKey: ["admin-products-for-reviews"],
    queryFn: () => api<Paginated<Product>>(`/products/?page_size=50&ordering=-id`),
  });

  const productList = products.data?.results ?? [];

  return (
    <TableShell
      columns={["Product", "Name", "Review", ""]}
      loading={products.isLoading}
      error={products.isError}
      empty={productList.length === 0}
    >
      {productList.map((p) => (
        <ProductReviews key={p.id} product={p} />
      ))}
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
    mutationFn: (id: number) =>
      api<void>(`/products/${product.id}/reviews/${id}/`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews", product.id] }),
  });
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map((r) => (
        <tr key={`${product.id}-${r.id}`} className="border-t border-border">
          <td className="px-4 py-3 font-semibold">{product.model_name}</td>
          <td className="px-4 py-3">{r.name}</td>
          <td className="px-4 py-3 text-muted-foreground">{r.description}</td>
          <td className="px-4 py-3">
            <div className="flex justify-end">
              <GhostBtn
                danger
                onClick={() => {
                  if (confirmDelete(`review by "${r.name}"`)) remove.mutate(r.id);
                }}
              >
                Delete
              </GhostBtn>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ---------- Customers ----------

type AdminCustomer = {
  id: number;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  membership?: string;
  birth_date?: string | null;
};

function CustomersTable() {
  const q = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => api<Paginated<AdminCustomer> | AdminCustomer[]>(`/customers/`),
    retry: false,
  });
  const crud = useCrud<AdminCustomer>("customers", ["admin-customers"]);
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <TableShell
      columns={["ID", "Name", "Email", "Phone", "Membership", ""]}
      loading={q.isLoading}
      error={q.isError}
      empty={rows.length === 0}
    >
      {rows.map((c) => (
        <tr key={c.id} className="border-t border-border">
          <td className="px-4 py-3 text-muted-foreground">#{c.id}</td>
          <td className="px-4 py-3 font-semibold">
            {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
          </td>
          <td className="px-4 py-3">{c.email || "—"}</td>
          <td className="px-4 py-3">{c.phone_number || "—"}</td>
          <td className="px-4 py-3 uppercase tracking-widest text-xs">{c.membership || "—"}</td>
          <td className="px-4 py-3">
            <div className="flex justify-end">
              <GhostBtn
                danger
                onClick={() => {
                  if (confirmDelete(`customer #${c.id}`)) crud.remove.mutate(c.id);
                }}
              >
                Delete
              </GhostBtn>
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------- Orders ----------

type AdminOrder = {
  id: number;
  customer?: number | { id: number; first_name?: string; last_name?: string };
  payment_status?: string;
  placed_at?: string;
  items?: { id: number; quantity: number; unit_price: string | number }[];
};

function OrdersTable() {
  const q = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => api<Paginated<AdminOrder> | AdminOrder[]>(`/orders/`),
    retry: false,
  });
  const crud = useCrud<AdminOrder>("orders", ["admin-orders"]);
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <TableShell
      columns={["ID", "Customer", "Status", "Items", "Total", "Placed", ""]}
      loading={q.isLoading}
      error={q.isError}
      empty={rows.length === 0}
    >
      {rows.map((o) => {
        const items: NonNullable<AdminOrder["items"]> = o.items ?? [];
        const total = items.reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0);
        const customer =
          typeof o.customer === "object" && o.customer
            ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ") || `#${o.customer.id}`
            : o.customer
              ? `#${o.customer}`
              : "—";
        return (
          <tr key={o.id} className="border-t border-border">
            <td className="px-4 py-3 text-muted-foreground">#{o.id}</td>
            <td className="px-4 py-3 font-semibold">{customer}</td>
            <td className="px-4 py-3">
              <select
                defaultValue={o.payment_status || "P"}
                onChange={(e) =>
                  crud.update.mutate({ id: o.id, data: { payment_status: e.target.value } as Partial<AdminOrder> })
                }
                className="rounded border border-border bg-background px-2 py-1 text-xs uppercase tracking-widest"
              >
                <option value="P">Pending</option>
                <option value="C">Complete</option>
                <option value="F">Failed</option>
              </select>
            </td>
            <td className="px-4 py-3">{items.length}</td>
            <td className="px-4 py-3 font-display text-primary">${total.toFixed(2)}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">
              {o.placed_at ? new Date(o.placed_at).toLocaleString() : "—"}
            </td>
            <td className="px-4 py-3">
              <div className="flex justify-end">
                <GhostBtn
                  danger
                  onClick={() => {
                    if (confirmDelete(`order #${o.id}`)) crud.remove.mutate(o.id);
                  }}
                >
                  Delete
                </GhostBtn>
              </div>
            </td>
          </tr>
        );
      })}
    </TableShell>
  );
}

// ---------- Carts ----------

function CartsTable() {
  const q = useQuery({
    queryKey: ["admin-carts"],
    queryFn: () => api<Paginated<Cart> | Cart[]>(`/carts/`),
    retry: false,
  });
  const crud = useCrud<Cart>("carts", ["admin-carts"]);
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <TableShell
      columns={["Cart ID", "Items", "Total", ""]}
      loading={q.isLoading}
      error={q.isError}
      empty={rows.length === 0}
    >
      {rows.map((c) => (
        <tr key={c.id} className="border-t border-border">
          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.id}</td>
          <td className="px-4 py-3">{c.items?.length ?? 0}</td>
          <td className="px-4 py-3 font-display text-primary">
            ${Number(c.total_price ?? 0).toFixed(2)}
          </td>
          <td className="px-4 py-3">
            <div className="flex justify-end">
              <GhostBtn
                danger
                onClick={() => {
                  if (confirmDelete(`cart ${c.id}`)) crud.remove.mutate(c.id);
                }}
              >
                Delete
              </GhostBtn>
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------- Messages ----------

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
  const rows = Array.isArray(q.data) ? q.data : q.data?.results ?? [];
  return (
    <div className="space-y-3">
      {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {q.isError && (
        <p className="text-sm text-destructive">Failed to load messages.</p>
      )}
      {rows.map((m) => (
        <div key={m.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-semibold">{m.contact_name}</div>
              <div className="text-xs text-muted-foreground">
                {m.contact_phone} · {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-display text-xl text-primary">
                ${Number(m.total_price).toFixed(2)}
              </div>
              <GhostBtn
                danger
                onClick={() => {
                  if (confirmDelete(`message from "${m.contact_name}"`)) remove.mutate(m.id);
                }}
              >
                Delete
              </GhostBtn>
            </div>
          </div>
          {m.contact_note && (
            <p className="mt-2 text-sm text-muted-foreground">{m.contact_note}</p>
          )}
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
      {!q.isLoading && rows.length === 0 && (
        <p className="text-muted-foreground">No messages yet.</p>
      )}
    </div>
  );
}
