import Link from "next/link";
import type { ReactNode } from "react";
import { expectedImageFiles, homeContent, storefrontImages } from "@/config/storefront";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icons";
import type { Category } from "@/lib/types";
import { ImageSlot } from "./image-slot";

/* Home page sections (Server Components). Copy and images come from src/config/storefront.ts. */

export const wrap = "mx-auto w-full max-w-7xl px-4 sm:px-6";

const iconFor: Record<string, IconName> = {
  halal: "shieldCheck",
  coins: "coins",
  truck: "truck",
  support: "headset",
  invoice: "receipt",
  repeat: "repeat",
  box: "box",
};

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold tracking-[0.14em] text-cta-from uppercase">{children}</p>;
}

export function SectionHeading({ id, eyebrow, title, action }: { id: string; eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 id={id} className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href as "/shop"} className="inline-flex items-center gap-1 text-sm font-semibold text-brand underline-offset-4 hover:underline">
      {children} <Icon name="arrowRight" className="size-4" />
    </Link>
  );
}

export function Hero() {
  const h = homeContent.hero;
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b border-line">
      <div className="absolute inset-0 -z-10">
        <ImageSlot image={storefrontImages.hero} sizes="100vw" priority placeholder={expectedImageFiles.hero} decorativeAlt="" labelPosition="corner" className="h-full w-full" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--hero-overlay)_0%,var(--hero-overlay)_42%,transparent_78%)]" />
      <div className={`${wrap} flex min-h-[26rem] flex-col items-center justify-center pt-24 pb-14 text-center sm:min-h-[30rem] sm:py-14`}>
        <Eyebrow>{h.eyebrow}</Eyebrow>
        <h1 id="hero-title" className="mt-3 max-w-3xl font-serif text-4xl leading-tight font-semibold tracking-tight text-brand sm:text-5xl lg:text-6xl">
          {h.title}
        </h1>
        <p className="mt-4 max-w-xl text-base text-foreground sm:text-lg">{h.description}</p>
        <Link
          href={h.cta.href}
          className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-cta-from to-cta-to px-7 text-base font-semibold text-white shadow-lg shadow-black/10 transition hover:brightness-110"
        >
          {h.cta.label}
          <Icon name="arrowRight" className="size-5" />
        </Link>
      </div>
    </section>
  );
}

export function Benefits() {
  return (
    <section aria-label="Why buy from us" className="border-b border-line bg-surface">
      <ul className={`${wrap} grid grid-cols-2 gap-x-4 gap-y-5 py-6 lg:grid-cols-4 lg:divide-x lg:divide-line`}>
        {homeContent.benefits.map((b) => (
          <li key={b.title} className="flex items-start gap-3 lg:px-5 lg:first:pl-0">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-brand/30 text-brand">
              <Icon name={iconFor[b.icon]} className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{b.title}</span>
              <span className="block text-xs text-muted">{b.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section id="categories" aria-labelledby="categories-title" className={`${wrap} scroll-mt-40 py-12`}>
      <SectionHeading id="categories-title" eyebrow="Browse our catalog" title="Everything your business needs" action={<ArrowLink href="/shop">View all products</ArrowLink>} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={`/shop?category=${c.slug}`} className="group block h-full overflow-hidden rounded-ui border border-line bg-surface shadow-sm transition hover:border-brand hover:shadow-md">
              <ImageSlot
                image={c.image ? { src: c.image.src, alt: c.image.alt, width: c.image.width, height: c.image.height } : storefrontImages.categories[c.slug]}
                sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                placeholder={expectedImageFiles.category(c.slug)}
                compact
                decorativeAlt=""
                className="aspect-[4/3]"
              />
              <span className="block px-3 py-2.5 text-center text-sm font-medium group-hover:text-brand">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BusinessSection() {
  const b = homeContent.business;
  return (
    <section aria-labelledby="business-title" className={`${wrap} py-12`}>
      <div className="grid gap-6 rounded-[1.25rem] border border-line bg-brand-soft/50 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center">
        <div>
          <span aria-hidden className="mb-4 block h-1 w-10 rounded-full bg-cta-from" />
          <Eyebrow>{b.eyebrow}</Eyebrow>
          <h2 id="business-title" className="mt-2 text-3xl font-semibold tracking-tight">{b.title}</h2>
          <p className="mt-3 text-sm text-muted">{b.text}</p>
          <ButtonLink href={b.cta.href} className="mt-5">
            {b.cta.label} <Icon name="arrowRight" className="size-4" />
          </ButtonLink>
        </div>
        <ImageSlot
          image={storefrontImages.owner}
          imageClassName="object-top"
          sizes="(min-width: 1024px) 28vw, 100vw"
          placeholder={expectedImageFiles.owner}
          className="mx-auto aspect-[4/3] w-full max-w-md rounded-ui sm:aspect-[4/5] lg:max-w-none"
        />
        <ul className="grid grid-cols-2 gap-3">
          {b.cards.map((c) => (
            <li key={c.title} className="rounded-ui border border-line bg-surface p-4 text-center shadow-sm">
              <span className="mx-auto grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
                <Icon name={iconFor[c.icon]} className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold">{c.title}</p>
              <span aria-hidden className="mx-auto my-2 block h-0.5 w-6 rounded-full bg-cta-from/70" />
              <p className="text-xs text-muted">{c.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function DeliverySection({ children }: { children: ReactNode }) {
  const d = homeContent.delivery;
  return (
    <section id="delivery" aria-labelledby="delivery-title" className={`${wrap} scroll-mt-40 py-6`}>
      <div className="grid gap-6 overflow-hidden rounded-[1.25rem] border border-line bg-brand-soft/60 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <Eyebrow>{d.eyebrow}</Eyebrow>
          <h2 id="delivery-title" className="mt-2 max-w-md text-3xl font-semibold tracking-tight">{d.title}</h2>
          <p className="mt-2 text-sm text-muted">{d.text}</p>
          <div className="mt-5">{children}</div>
        </div>
        <ImageSlot image={storefrontImages.delivery} sizes="(min-width: 1024px) 45vw, 100vw" placeholder={expectedImageFiles.delivery} decorativeAlt="" className="aspect-[16/9] w-full rounded-ui" />
      </div>
    </section>
  );
}

export function Steps() {
  return (
    <section aria-labelledby="steps-title" className={`${wrap} py-12`}>
      <SectionHeading id="steps-title" eyebrow="How it works" title="Start wholesale shopping in 4 simple steps" />
      <ol className="grid gap-5 sm:grid-cols-2 lg:flex lg:items-start lg:gap-4">
        {homeContent.steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 lg:flex-1 lg:items-start">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-lg font-semibold text-brand-contrast">{i + 1}</span>
            <span className="min-w-0 lg:flex-1">
              <span className="flex items-center gap-3">
                <span className="text-sm font-semibold">{s.title}</span>
                {i < homeContent.steps.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-line lg:block" />}
              </span>
              <span className="block text-xs text-muted">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Journal() {
  return (
    <section aria-labelledby="journal-title" className={`${wrap} pb-12`}>
      <SectionHeading id="journal-title" eyebrow="From our wholesale journal" title="Guides for food businesses" action={<span className="text-xs text-muted">Sample articles — coming soon</span>} />
      <ul className="grid gap-4 md:grid-cols-3">
        {homeContent.journal.map((a) => (
          <li key={a.key} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 rounded-ui border border-line bg-surface p-3 shadow-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
            <ImageSlot image={storefrontImages.journal[a.key]} sizes="128px" placeholder={expectedImageFiles.journal(a.key)} compact decorativeAlt="" className="aspect-square rounded-ui" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wide text-brand uppercase">{a.tag}</p>
              <h3 className="mt-1 text-sm leading-snug font-semibold">{a.title}</h3>
              <p className="mt-1 line-clamp-3 text-xs text-muted">{a.text}</p>
              <span className="mt-2 inline-block rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted">Coming soon</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ContactStrip() {
  const c = homeContent.contactStrip;
  return (
    <section aria-labelledby="contact-strip-title" className="bg-brand text-brand-contrast">
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 py-7`}>
        <div>
          <h2 id="contact-strip-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h2>
          <p className="mt-1 text-sm opacity-90">{c.text}</p>
        </div>
        <Link href={c.cta.href} className="inline-flex h-11 items-center gap-2 rounded-ui bg-surface px-5 text-sm font-semibold text-foreground hover:bg-surface-muted">
          {c.cta.label} <Icon name="arrowRight" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
