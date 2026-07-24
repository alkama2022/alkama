import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Mail, MapPin, MessageCircle, Clock, ArrowRight, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Khal Tyres Company Limited" },
      {
        name: "description",
        content:
          "Get in touch with Khal Tyres Company Limited. Call CEO Ibrahim Tahir on 0803 936 6958, WhatsApp us, or visit one of our 4 branches.",
      },
      { property: "og:title", content: "Contact Us — Khal Tyres Company Limited" },
      {
        property: "og:description",
        content:
          "Call CEO Ibrahim Tahir on 0803 936 6958, WhatsApp us, or visit one of our 4 branches.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ContactPage,
});

const phone = "07034883127";
const whatsappNumber = "2348039366958";
const email = "ibrahimtahir3936@gmail.com";

const contactMethods = [
  {
    icon: Phone,
    label: "Call us",
    value: phone,
    href: "tel:08039366958",
    note: "Mon – Sun, 8am – 8pm",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: phone,
    href: `https://wa.me/${whatsappNumber}`,
    note: "Fastest reply for fitment advice",
  },
  {
    icon: Mail,
    label: "Email",
    value: email,
    href: `mailto:${email}`,
    note: "Replies within 24 hours",
  },
];

const branches = [
  {
    name: "KHALTYRES COMPANY LIMITED - HOTORO",
    address: "Hotoro danmarke, sarina house. Phone: +2349137899326",
  },
  {
    name: "KHALTYRES COMPANY LIMITED - YANKABA",
    address: "Yankaba market, opposite keystone bank. Phone: +2349042316272",
  },
  {
    name: "KHALTYRES COMPANY LIMITED - U/UKU",
    address: "Unguwa uku bus station, near police outpost. Phone: +2348131273788",
  },
  {
    name: "KHALTYRES COMPANY LIMITED - FARM CENTER",
    address: "Phone market, farm center, near tecno plaza. Phone: Nil",
  },
];

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = encodeURIComponent(
      `Hi Khal Tyres Company Limited,\n\nName: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nMessage:\n${form.message}`,
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 diagonal-stripes opacity-30" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
          <div className="max-w-3xl">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Get in touch
            </span>
            <h1 className="font-display text-5xl uppercase leading-none tracking-wide sm:text-7xl">
              Let's talk <span className="text-primary">tyres.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Have a question about fitment, stock or pricing? Reach out by phone on{" "}
              <strong className="text-foreground">{phone}</strong>, WhatsApp, or visit one of our 4
              branches.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact info */}
          <div className="space-y-10">
            <div className="grid gap-6 sm:grid-cols-3">
              {contactMethods.map(({ icon: Icon, label, value, href, note }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group rounded-lg border border-border bg-card p-5 transition hover:border-primary"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-md bg-primary/10 p-2.5 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {label}
                      </div>
                      <div className="mt-1 font-semibold text-foreground group-hover:text-primary transition break-all">
                        {value}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div>
              <h2 className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
                <MapPin className="h-5 w-5 text-primary" />
                Our branches
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {branches.map((branch) => (
                  <div key={branch.name} className="rounded-lg border border-border p-4">
                    <div className="font-semibold">{branch.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{branch.address}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div className="font-semibold uppercase tracking-wide">Opening hours</div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li className="flex justify-between">
                  <span>Monday – Friday</span>
                  <span>8:00 AM – 8:00 PM</span>
                </li>
                <li className="flex justify-between">
                  <span>Saturday</span>
                  <span>8:00 AM – 8:00 PM</span>
                </li>
                <li className="flex justify-between">
                  <span>Sunday</span>
                  <span>8:00 AM – 8:00 PM</span>
                </li>
              </ul>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-primary">
                We are always available during the above hours.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
            <h2 className="font-display text-2xl uppercase tracking-wide">Send a message</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fill in the form and we'll open a WhatsApp chat with your details ready to send.
            </p>

            {submitted ? (
              <div className="mt-8 flex flex-col items-center justify-center rounded-md border border-primary/30 bg-primary/10 p-8 text-center">
                <CheckCircle className="h-10 w-10 text-primary" />
                <div className="mt-3 font-semibold">WhatsApp opened</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  If it didn't open, check your browser's pop-up blocker.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-sm font-semibold text-primary hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium">
                    Full name
                  </label>
                  <input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium">
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="0803 936 6958"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Tell us your vehicle model, tyre size or question..."
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground hover:brightness-110 transition"
                >
                  Message us on WhatsApp <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
