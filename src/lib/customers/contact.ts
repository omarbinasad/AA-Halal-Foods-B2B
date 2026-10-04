/** Pure contact/address format checks (no imports, so they are unit-testable with Node directly). */

/** Bangladesh mobile/landline: "01XXXXXXXXX" or "+880 1XXXXXXXXX" (spaces and dashes allowed). */
export function isBdPhone(value: string) {
  if (!/^[+\d][\d\s-]*$/.test(value.trim())) return false;
  const digits = value.replace(/\D/g, "");
  return /^(?:880|0)1[3-9]\d{8}$/.test(digits) || /^(?:880|0)[2-9]\d{6,9}$/.test(digits);
}

/** Bangladesh postcodes are 4 digits. Format only — not a check that the code exists. */
export const isPostcode = (v: string) => /^\d{4}$/.test(v.trim());

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
