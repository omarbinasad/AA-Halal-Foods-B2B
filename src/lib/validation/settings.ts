/** Store settings validation shared by the settings form and the mock repository. */
import { isBdPhone, isEmail, isPostcode } from "@/lib/customers/contact";
import { BD_DIVISIONS } from "@/lib/locations";
import type { FieldErrors, StoreSettingsInput } from "@/lib/types";

export function validateStoreSettings(input: StoreSettingsInput): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.storeName.trim();
  if (name.length < 2) errors.storeName = "Enter the store name.";
  else if (name.length > 80) errors.storeName = "Keep it under 80 characters.";
  if (input.email && !isEmail(input.email)) errors.email = "Enter a valid email address.";
  if (input.phone && !isBdPhone(input.phone)) errors.phone = "Use a Bangladesh phone number.";
  const a = input.address;
  if (!a.addressLine1.trim()) errors["address.addressLine1"] = "Street address is required.";
  if (!a.district.trim()) errors["address.district"] = "District is required.";
  if (!BD_DIVISIONS.includes(a.division as (typeof BD_DIVISIONS)[number])) errors["address.division"] = "Choose a division.";
  if (!isPostcode(a.postalCode)) errors["address.postalCode"] = "Use a 4-digit postcode.";
  if (a.country !== "BD") errors["address.country"] = "The store is in Bangladesh in this version.";
  if (input.weightUnit !== "kg" && input.weightUnit !== "g") errors.weightUnit = "Choose kg or g.";
  if (!["cm", "mm", "m"].includes(input.dimensionUnit)) errors.dimensionUnit = "Choose cm, mm or m.";
  for (const key of ["addressLine1", "addressLine2", "area", "district"] as const) {
    if (!errors[`address.${key}`] && (a[key] ?? "").length > 200) errors[`address.${key}`] = "Too long.";
  }
  return errors;
}
