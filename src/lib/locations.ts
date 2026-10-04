/** Bangladesh's eight administrative divisions (the top address level). */
export const BD_DIVISIONS = ["Barishal", "Chattogram", "Dhaka", "Khulna", "Mymensingh", "Rajshahi", "Rangpur", "Sylhet"] as const;

export type BdDivision = (typeof BD_DIVISIONS)[number];
