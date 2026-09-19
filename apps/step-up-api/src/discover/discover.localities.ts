/** Curated Chennai areas for discover. Derived from address, pincode, or coords. */

import { containsAddressToken, normalizeAddress } from "./discover.cities";
import { haversineKm } from "./discover.geo";

export type DiscoverLocality = {
  id: string;
  label: string;
  aliases: string[];
  popular?: boolean;
  lat?: number;
  lng?: number;
};

export const CHENNAI_LOCALITIES: readonly DiscoverLocality[] = [
  {
    id: "adyar",
    label: "Adyar",
    aliases: ["adyar", "adayar"],
    popular: true,
    lat: 13.0067,
    lng: 80.2206,
  },
  {
    id: "velachery",
    label: "Velachery",
    aliases: ["velachery", "velacheri"],
    popular: true,
    lat: 12.9816,
    lng: 80.2209,
  },
  {
    id: "anna-nagar",
    label: "Anna Nagar",
    aliases: ["anna nagar", "annanagar", "anna nagar east", "anna nagar west"],
    popular: true,
    lat: 13.085,
    lng: 80.21,
  },
  {
    id: "t-nagar",
    label: "T Nagar",
    aliases: ["t nagar", "thyagaraya nagar", "tnagar"],
    popular: true,
    lat: 13.0418,
    lng: 80.2341,
  },
  {
    id: "omr",
    label: "OMR",
    aliases: [
      "omr",
      "old mahabalipuram road",
      "rajiv gandhi salai",
      "it corridor",
    ],
    popular: true,
    lat: 12.9279,
    lng: 80.231,
  },
  {
    id: "mylapore",
    label: "Mylapore",
    aliases: ["mylapore", "mailapur"],
    popular: true,
    lat: 13.0334,
    lng: 80.2687,
  },
  {
    id: "tambaram",
    label: "Tambaram",
    aliases: ["tambaram", "east tambaram", "west tambaram"],
    popular: true,
    lat: 12.9249,
    lng: 80.1,
  },
  {
    id: "porur",
    label: "Porur",
    aliases: ["porur"],
    popular: true,
    lat: 13.0358,
    lng: 80.1565,
  },
  {
    id: "nungambakkam",
    label: "Nungambakkam",
    aliases: ["nungambakkam"],
    popular: true,
    lat: 13.06,
    lng: 80.242,
  },
  {
    id: "besant-nagar",
    label: "Besant Nagar",
    aliases: ["besant nagar", "besantnagar"],
    popular: true,
    lat: 13.0002,
    lng: 80.2666,
  },
  {
    id: "madipakkam",
    label: "Madipakkam",
    aliases: ["madipakkam"],
    popular: true,
    lat: 12.9623,
    lng: 80.1986,
  },
  {
    id: "ambattur",
    label: "Ambattur",
    aliases: ["ambattur"],
    popular: true,
    lat: 13.1143,
    lng: 80.1548,
  },
  {
    id: "thiruvanmiyur",
    label: "Thiruvanmiyur",
    aliases: ["thiruvanmiyur", "tiruvanmiyur"],
    lat: 12.983,
    lng: 80.2594,
  },
  {
    id: "guindy",
    label: "Guindy",
    aliases: ["guindy"],
    lat: 13.0067,
    lng: 80.2209,
  },
  {
    id: "saidapet",
    label: "Saidapet",
    aliases: ["saidapet"],
    lat: 13.0213,
    lng: 80.2231,
  },
  {
    id: "adambakkam",
    label: "Adambakkam",
    aliases: ["adambakkam"],
    lat: 12.988,
    lng: 80.201,
  },
  {
    id: "nanganallur",
    label: "Nanganallur",
    aliases: ["nanganallur"],
    lat: 12.9805,
    lng: 80.188,
  },
  {
    id: "pallikaranai",
    label: "Pallikaranai",
    aliases: ["pallikaranai"],
    lat: 12.934,
    lng: 80.207,
  },
  {
    id: "medavakkam",
    label: "Medavakkam",
    aliases: ["medavakkam"],
    lat: 12.9172,
    lng: 80.1923,
  },
  {
    id: "alwarpet",
    label: "Alwarpet",
    aliases: ["alwarpet"],
    lat: 13.0339,
    lng: 80.254,
  },
  {
    id: "ra-puram",
    label: "RA Puram",
    aliases: ["ra puram", "raja annamalaipuram"],
    lat: 13.0235,
    lng: 80.258,
  },
  {
    id: "teynampet",
    label: "Teynampet",
    aliases: ["teynampet"],
    lat: 13.0405,
    lng: 80.2506,
  },
  {
    id: "kodambakkam",
    label: "Kodambakkam",
    aliases: ["kodambakkam"],
    lat: 13.0521,
    lng: 80.2209,
  },
  {
    id: "west-mambalam",
    label: "West Mambalam",
    aliases: ["west mambalam", "mambalam"],
    lat: 13.038,
    lng: 80.2205,
  },
  {
    id: "egmore",
    label: "Egmore",
    aliases: ["egmore"],
    lat: 13.0732,
    lng: 80.2609,
  },
  {
    id: "kilpauk",
    label: "Kilpauk",
    aliases: ["kilpauk"],
    lat: 13.0785,
    lng: 80.243,
  },
  {
    id: "mogappair",
    label: "Mogappair",
    aliases: ["mogappair", "mogapair"],
    lat: 13.0837,
    lng: 80.176,
  },
  {
    id: "valasaravakkam",
    label: "Valasaravakkam",
    aliases: ["valasaravakkam"],
    lat: 13.0404,
    lng: 80.1722,
  },
  {
    id: "vadapalani",
    label: "Vadapalani",
    aliases: ["vadapalani"],
    lat: 13.0507,
    lng: 80.212,
  },
  {
    id: "koyambedu",
    label: "Koyambedu",
    aliases: ["koyambedu"],
    lat: 13.0694,
    lng: 80.1948,
  },
  {
    id: "virugambakkam",
    label: "Virugambakkam",
    aliases: ["virugambakkam"],
    lat: 13.0475,
    lng: 80.1922,
  },
  {
    id: "ramapuram",
    label: "Ramapuram",
    aliases: ["ramapuram"],
    lat: 13.0315,
    lng: 80.1817,
  },
  {
    id: "perungudi",
    label: "Perungudi",
    aliases: ["perungudi"],
    lat: 12.9654,
    lng: 80.246,
  },
  {
    id: "thoraipakkam",
    label: "Thoraipakkam",
    aliases: ["thoraipakkam", "okkiyam thoraipakkam"],
    lat: 12.949,
    lng: 80.2388,
  },
  {
    id: "sholinganallur",
    label: "Sholinganallur",
    aliases: ["sholinganallur", "solinganallur"],
    lat: 12.901,
    lng: 80.2279,
  },
  {
    id: "taramani",
    label: "Taramani",
    aliases: ["taramani"],
    lat: 12.978,
    lng: 80.243,
  },
  {
    id: "neelankarai",
    label: "Neelankarai",
    aliases: ["neelankarai"],
    lat: 12.9495,
    lng: 80.2548,
  },
  {
    id: "palavakkam",
    label: "Palavakkam",
    aliases: ["palavakkam"],
    lat: 12.9608,
    lng: 80.2562,
  },
  {
    id: "injambakkam",
    label: "Injambakkam",
    aliases: ["injambakkam"],
    lat: 12.919,
    lng: 80.251,
  },
  {
    id: "chromepet",
    label: "Chromepet",
    aliases: ["chromepet", "chrompet"],
    lat: 12.9516,
    lng: 80.1462,
  },
  {
    id: "pallavaram",
    label: "Pallavaram",
    aliases: ["pallavaram"],
    lat: 12.9675,
    lng: 80.1491,
  },
  {
    id: "st-thomas-mount",
    label: "St Thomas Mount",
    aliases: ["st thomas mount", "parangimalai"],
    lat: 13.005,
    lng: 80.193,
  },
  {
    id: "perambur",
    label: "Perambur",
    aliases: ["perambur"],
    lat: 13.121,
    lng: 80.2326,
  },
  {
    id: "kolathur",
    label: "Kolathur",
    aliases: ["kolathur"],
    lat: 13.124,
    lng: 80.212,
  },
  {
    id: "villivakkam",
    label: "Villivakkam",
    aliases: ["villivakkam"],
    lat: 13.1086,
    lng: 80.206,
  },
  {
    id: "royapuram",
    label: "Royapuram",
    aliases: ["royapuram"],
    lat: 13.104,
    lng: 80.293,
  },
  {
    id: "washermanpet",
    label: "Washermanpet",
    aliases: ["washermanpet", "washermenpet"],
    lat: 13.1148,
    lng: 80.287,
  },
] as const;

const LOCALITY_BY_ID = new Map(
  CHENNAI_LOCALITIES.map((locality) => [locality.id, locality]),
);

const PINCODE_TO_LOCALITY: Record<string, string> = {
  600004: "mylapore",
  600005: "mylapore",
  600006: "alwarpet",
  600008: "egmore",
  600010: "kilpauk",
  600011: "perambur",
  600017: "t-nagar",
  600018: "teynampet",
  600020: "adyar",
  600024: "kodambakkam",
  600026: "vadapalani",
  600028: "ra-puram",
  600033: "teynampet",
  600034: "nungambakkam",
  600035: "nanganallur",
  600040: "anna-nagar",
  600041: "adyar",
  600042: "velachery",
  600043: "pallavaram",
  600044: "chromepet",
  600045: "tambaram",
  600050: "anna-nagar",
  600061: "nanganallur",
  600088: "adambakkam",
  600091: "madipakkam",
  600092: "virugambakkam",
  600093: "vadapalani",
  600096: "perungudi",
  600097: "thoraipakkam",
  600099: "ambattur",
  600100: "medavakkam",
  600102: "anna-nagar",
  600107: "koyambedu",
  600116: "porur",
  600119: "sholinganallur",
};

const GEO_SNAP_KM = 3;

export function findLocalityById(id: string): DiscoverLocality | null {
  return LOCALITY_BY_ID.get(id.trim().toLowerCase()) ?? null;
}

export function extractPincode(value: string): string | null {
  const match = value.match(/\b(600\d{3})\b/);
  return match?.[1] ?? null;
}

function nearestLocality(point: {
  lat: number;
  lng: number;
}): DiscoverLocality | null {
  let best: DiscoverLocality | null = null;
  let bestKm = GEO_SNAP_KM;
  for (const locality of CHENNAI_LOCALITIES) {
    if (locality.lat == null || locality.lng == null) continue;
    const km = haversineKm(point.lat, point.lng, locality.lat, locality.lng);
    if (km <= bestKm) {
      best = locality;
      bestKm = km;
    }
  }
  return best;
}

export function matchLocality(input: {
  addresses: Array<string | null | undefined>;
  latitude?: number | null;
  longitude?: number | null;
}): DiscoverLocality | null {
  const joined = input.addresses.filter(Boolean).join(" ");
  if (joined) {
    const pin = extractPincode(joined);
    if (pin) {
      const id = PINCODE_TO_LOCALITY[pin];
      const byPin = id ? findLocalityById(id) : null;
      if (byPin) return byPin;
    }

    const normalized = normalizeAddress(joined);
    let best: DiscoverLocality | null = null;
    let bestLen = 0;
    for (const locality of CHENNAI_LOCALITIES) {
      for (const alias of locality.aliases) {
        if (
          containsAddressToken(normalized, alias) &&
          alias.length >= bestLen
        ) {
          best = locality;
          bestLen = alias.length;
        }
      }
    }
    if (best) return best;
  }

  if (input.latitude != null && input.longitude != null) {
    return nearestLocality({ lat: input.latitude, lng: input.longitude });
  }
  return null;
}

export function styleSearchKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function stylesMatchQuery(styles: string[], query: string): boolean {
  const needle = styleSearchKey(query);
  if (!needle) return true;
  return styles.some((style) => styleSearchKey(style).includes(needle));
}
