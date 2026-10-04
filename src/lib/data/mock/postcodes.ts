/**
 * SAMPLE postcode lookup data — a handful of entries for the demo only. It is
 * NOT a complete or verified list of Bangladesh postcodes; the real lookup must
 * come from an official/maintained dataset on the backend.
 */
export interface SamplePostcode {
  postalCode: string;
  postOffice: string;
  area: string;
  district: string;
  division: string;
}

export const samplePostcodes: SamplePostcode[] = [
  { postalCode: "1212", postOffice: "Gulshan Model Town", area: "Gulshan", district: "Dhaka", division: "Dhaka" },
  { postalCode: "1209", postOffice: "Dhanmondi", area: "Dhanmondi", district: "Dhaka", division: "Dhaka" },
  { postalCode: "1216", postOffice: "Mirpur", area: "Mirpur", district: "Dhaka", division: "Dhaka" },
  { postalCode: "1230", postOffice: "Uttara Model Town", area: "Uttara", district: "Dhaka", division: "Dhaka" },
  { postalCode: "1710", postOffice: "Tongi", area: "Tongi", district: "Gazipur", division: "Dhaka" },
  { postalCode: "1400", postOffice: "Narayanganj", area: "Sadar", district: "Narayanganj", division: "Dhaka" },
  { postalCode: "4100", postOffice: "Chattogram GPO", area: "Agrabad", district: "Chattogram", division: "Chattogram" },
  { postalCode: "4216", postOffice: "Halishahar", area: "Halishahar", district: "Chattogram", division: "Chattogram" },
  { postalCode: "4700", postOffice: "Cox's Bazar", area: "Sadar", district: "Cox's Bazar", division: "Chattogram" },
  { postalCode: "3100", postOffice: "Sylhet", area: "Zindabazar", district: "Sylhet", division: "Sylhet" },
  { postalCode: "9100", postOffice: "Khulna", area: "Sonadanga", district: "Khulna", division: "Khulna" },
  { postalCode: "6100", postOffice: "Rajshahi", area: "Boalia", district: "Rajshahi", division: "Rajshahi" },
];
