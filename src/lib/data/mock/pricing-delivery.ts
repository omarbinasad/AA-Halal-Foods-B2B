import type { DeliveryRoute, Reminder } from "@/lib/types";

export const mockDeliveryRoutes: DeliveryRoute[] = [
  {
    id: "route-dhaka",
    name: "Dhaka Metro",
    areas: ["Dhaka", "Gazipur", "Narayanganj"],
    deliveryDays: ["sat", "sun", "mon", "tue", "wed", "thu"],
    cutoffTime: "16:00",
    shippingFee: 0,
    active: true,
  },
  {
    id: "route-chattogram",
    name: "Chattogram division",
    areas: ["Chattogram", "Cox's Bazar", "Cumilla"],
    deliveryDays: ["sun", "tue", "thu"],
    cutoffTime: "14:00",
    shippingFee: 350,
    freeShippingThreshold: 25000,
    active: true,
  },
  {
    id: "route-courier",
    name: "Nationwide courier",
    areas: ["Sylhet", "Khulna", "Rajshahi", "Barishal", "Rangpur", "Mymensingh"],
    deliveryDays: ["sat", "mon", "wed"],
    cutoffTime: "12:00",
    shippingFee: 600,
    freeShippingThreshold: 40000,
    active: true,
  },
];

export const mockReminders: Reminder[] = [
  {
    id: "rem-001",
    type: "order_cutoff",
    channel: "sms",
    deliveryRouteId: "route-dhaka",
    schedule: "Sat–Thu at 10:00",
    message: "Order before 16:00 today for next-day delivery.",
    active: true,
    lastSentAt: "2026-09-30T10:00:00+06:00",
  },
  {
    id: "rem-002",
    type: "reorder",
    channel: "email",
    customerId: "cus-002",
    schedule: "Every 2 weeks on Sunday",
    message: "Time to restock your regular items?",
    active: true,
  },
  {
    id: "rem-003",
    type: "payment_due",
    channel: "email",
    schedule: "3 days before invoice due date",
    message: "Your invoice is due soon.",
    active: false,
  },
];
