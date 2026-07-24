import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Users, MapPin, Award, UserCircle, Phone, ShieldCheck, Truck, Wrench } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Khal Tyres Company Limited" },
      {
        name: "description",
        content:
          "Khal Tyres Company Limited is led by CEO Ibrahim Tahir. We have 30+ employees and 4 branches supplying premium tyres, wheels and fitment services.",
      },
      { property: "og:title", content: "About Us — Khal Tyres Company Limited" },
      {
        property: "og:description",
        content:
          "Khal Tyres Company Limited is led by CEO Ibrahim Tahir. We have 30+ employees and 4 branches supplying premium tyres, wheels and fitment services.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

const stats = [
  { label: "Employees", value: "30+", icon: Users },
  { label: "Branches", value: "4", icon: MapPin },
  { label: "Years of experience", value: "25+", icon: Award },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Genuine products",
    body: "Every tyre and wheel we sell is sourced from authorised distributors with full manufacturer warranty.",
  },
  {
    icon: Truck,
    title: "Fast turnaround",
    body: "Same-day dispatch on in-stock items, and fleet services that keep your vehicles rolling.",
  },
  {
    icon: Wrench,
    title: "Expert fitment",
    body: "Our technicians are trained on the latest mounting and balancing equipment for cars, SUVs and light trucks.",
  },
];

function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 diagonal-stripes opacity-30" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
          <div className="max-w-3xl">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Who we are
            </span>
            <h1 className="font-display text-5xl uppercase leading-none tracking-wide sm:text-7xl">
              Built for the <span className="text-primary">road ahead.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Khal Tyres Company Limited is a locally owned automotive supplier led by CEO Ibrahim
              Tahir. We specialise in premium tyres, alloy wheels, wheel balancing and alignment.
              With a team of over 30 professionals across 4 branches, we have grown into a trusted
              name for daily drivers, fleets and performance enthusiasts.
            </p>
          </div>
        </div>
      </section>

      {/* Leadership /*/}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary">
              <UserCircle className="h-10 w-10" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Chief Executive Officer
              </div>
              <div className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
                Ibrahim Tahir
              </div>
              {/* <a
                href="tel:08039366958"
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                0803 936 6958
              </a> */}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="rounded-md bg-primary/10 p-3 text-primary">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <div className="font-display text-4xl text-primary">{value}</div>
                <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl uppercase sm:text-4xl">
          Why drivers choose <span className="text-primary">Khal Tyres</span>
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {values.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-6">
              <div className="rounded-md bg-primary/10 p-3 w-fit text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl uppercase tracking-wide">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row">
          <div className="text-center md:text-left">
            <h2 className="font-display text-3xl uppercase">Ready to upgrade your ride?</h2>
            <p className="mt-2 text-muted-foreground">
              Browse our catalogue or get in touch for personalised fitment advice.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 transition"
            >
              Shop tyres
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold uppercase tracking-widest hover:border-primary hover:text-primary transition"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
