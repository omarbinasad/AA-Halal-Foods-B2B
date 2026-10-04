import { siteConfig } from "@/config/site";
import type { Address, Money, StockStatus, Weight } from "@/lib/types";

const { currencySymbol, numberLocale, dateLocale, timeZone } = siteConfig;

const amountFmt = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 });
const paisaFmt = new Intl.NumberFormat(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat(numberLocale, { notation: "compact", maximumFractionDigits: 1 });
const numberFmt = new Intl.NumberFormat(numberLocale);
const dateFmt = new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "short", year: "numeric", timeZone });
const dateTimeFmt = new Intl.DateTimeFormat(dateLocale, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone,
});
/** For calendar dates ("YYYY-MM-DD") that carry no time zone. */
const calendarFmt = new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const calendarShortFmt = new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "short", timeZone: "UTC" });

const signed = (amount: number, text: string) => (amount < 0 ? `-${text}` : text);

/** ৳12,48,000 — or ৳16,573.20 when the amount has paisa, so displayed lines always add up. */
export const formatMoney = (amount: Money) => {
  const abs = Math.abs(amount);
  const fmt = Math.abs(abs * 100 - Math.round(abs) * 100) < 0.5 ? amountFmt : paisaFmt;
  return signed(amount, `${currencySymbol}${fmt.format(abs)}`);
};
/** ৳12.5L — for chart axes and tight spaces. */
export const formatMoneyCompact = (amount: Money) =>
  signed(amount, `${currencySymbol}${compactFmt.format(Math.abs(amount))}`);
export const formatNumber = (value: number) => numberFmt.format(value);
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
/** "2026-09-01" → "1 Sept 2026" */
export const formatCalendarDate = (date: string) => calendarFmt.format(new Date(`${date}T00:00:00Z`));
/** "2026-09-01" → "1 Sept" */
export const formatCalendarDateShort = (date: string) => calendarShortFmt.format(new Date(`${date}T00:00:00Z`));
export const formatWeight = (w: Weight) => `${w.value} ${w.unit}`;

/** Percentage change, or undefined when there is no meaningful baseline. */
export function percentChange(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

/** Address as display lines: street, area/district, division + postcode. */
export function formatAddressLines(a: Pick<Address, "addressLine1" | "addressLine2" | "area" | "district" | "division" | "postalCode">) {
  return [
    [a.addressLine1, a.addressLine2].filter(Boolean).join(", "),
    [a.area, a.district].filter(Boolean).join(", "),
    `${a.division} ${a.postalCode}`,
  ];
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
export const countryName = (code: string) => countryNames.of(code) ?? code;

export const stockLabels: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  backorder: "On backorder",
};

/** "in_stock" → "In stock" for enum-like values without a dedicated label map. */
export const humanize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");

/** "1 Sept 2026 – 30 Sept 2026", or "No comparison" when absent. */
export const formatDateRange = (r?: { from: string; to: string }) =>
  r ? `${formatCalendarDate(r.from)} – ${formatCalendarDate(r.to)}` : "No comparison";
