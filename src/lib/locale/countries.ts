/**
 * Country configuration. India is fully supported; others are scaffolded so the
 * planner can be extended by adding instruments and tax notes per country.
 */
export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  locale: string;
  symbol: string;
  supported: boolean;
}

export const COUNTRIES: CountryConfig[] = [
  { code: "IN", name: "India", currency: "INR", locale: "en-IN", symbol: "₹", supported: true },
  { code: "US", name: "United States", currency: "USD", locale: "en-US", symbol: "$", supported: false },
  { code: "GB", name: "United Kingdom", currency: "GBP", locale: "en-GB", symbol: "£", supported: false },
  { code: "AE", name: "UAE", currency: "AED", locale: "en-AE", symbol: "AED ", supported: false },
];

export const getCountry = (code: string) => COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
