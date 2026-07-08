export type TripTypeId =
  | "airport_pickup"
  | "airport_dropoff"
  | "12hrs"
  | "24hrs"
  | "multiple_days"
  | "interstate"
  | "interstate_chauffeur"
  | "wedding_event"
  | "corporate"
  | "vip_security"
  | "custom";

export interface TripType {
  id: TripTypeId;
  label: string;
  shortLabel: string;
  description: string;
  needsDestination: boolean;
  needsDays: boolean;
  needsFlight: boolean;
  needsState: boolean;
  /** trip is quoted from a fixed rate card (vs concierge estimate) */
  instantQuote: boolean;
  /** rate key on the vehicle rate card */
  rateKey?: "airportTransfer" | "twelveHours" | "twentyFourHours" | "multiDayDaily" | "interstateBase" | "interstateChauffeur";
  perDay?: boolean;
}

export const TRIP_TYPES: TripType[] = [
  {
    id: "airport_pickup",
    label: "Airport Pickup",
    shortLabel: "Airport pickup",
    description: "Met at arrivals, driven anywhere in Lagos",
    needsDestination: true,
    needsDays: false,
    needsFlight: true,
    needsState: false,
    instantQuote: true,
    rateKey: "airportTransfer",
  },
  {
    id: "airport_dropoff",
    label: "Airport Drop-off",
    shortLabel: "Airport drop-off",
    description: "Picked up in Lagos, delivered to your terminal",
    needsDestination: true,
    needsDays: false,
    needsFlight: true,
    needsState: false,
    instantQuote: true,
    rateKey: "airportTransfer",
  },
  {
    id: "12hrs",
    label: "12-Hour City Hire",
    shortLabel: "12-hour hire",
    description: "Half-day chauffeur-driven hire within Lagos",
    needsDestination: false,
    needsDays: false,
    needsFlight: false,
    needsState: false,
    instantQuote: true,
    rateKey: "twelveHours",
  },
  {
    id: "24hrs",
    label: "24-Hour City Hire",
    shortLabel: "24-hour hire",
    description: "Full-day chauffeur-driven hire within Lagos",
    needsDestination: false,
    needsDays: false,
    needsFlight: false,
    needsState: false,
    instantQuote: true,
    rateKey: "twentyFourHours",
  },
  {
    id: "multiple_days",
    label: "Multi-Day Hire",
    shortLabel: "Multi-day",
    description: "Extended hire for 2 or more days",
    needsDestination: false,
    needsDays: true,
    needsFlight: false,
    needsState: false,
    instantQuote: true,
    rateKey: "multiDayDaily",
    perDay: true,
  },
  {
    id: "interstate",
    label: "Interstate Travel",
    shortLabel: "Interstate",
    description: "Chauffeur-driven travel outside Lagos",
    needsDestination: true,
    needsDays: true,
    needsFlight: false,
    needsState: true,
    instantQuote: true,
    rateKey: "interstateBase",
    perDay: true,
  },
  {
    id: "interstate_chauffeur",
    label: "Chauffeur Only — Your Vehicle",
    shortLabel: "Chauffeur only",
    description: "An H06 chauffeur for your own vehicle, Lagos or interstate",
    needsDestination: true,
    needsDays: true,
    needsFlight: false,
    needsState: false,
    instantQuote: true,
    rateKey: "interstateChauffeur",
    perDay: true,
  },
  {
    id: "wedding_event",
    label: "Wedding & Special Occasion",
    shortLabel: "Wedding / event",
    description: "Bridal cars, convoys and event fleets, styled and coordinated",
    needsDestination: false,
    needsDays: false,
    needsFlight: false,
    needsState: false,
    instantQuote: false,
  },
  {
    id: "corporate",
    label: "Corporate Movement",
    shortLabel: "Corporate",
    description: "Executive transport, retainers and corporate accounts",
    needsDestination: false,
    needsDays: true,
    needsFlight: false,
    needsState: false,
    instantQuote: false,
  },
  {
    id: "vip_security",
    label: "VIP / Security-Conscious",
    shortLabel: "VIP & security",
    description: "Protocol, escorts and discreet high-profile movement",
    needsDestination: false,
    needsDays: false,
    needsFlight: false,
    needsState: false,
    instantQuote: false,
  },
  {
    id: "custom",
    label: "Custom Request",
    shortLabel: "Custom",
    description: "Tell the concierge exactly what you need",
    needsDestination: false,
    needsDays: false,
    needsFlight: false,
    needsState: false,
    instantQuote: false,
  },
];

export function getTripType(id: string): TripType | undefined {
  return TRIP_TYPES.find((t) => t.id === id);
}

/** Chauffeur-only rate card (H06 driver for the client's own vehicle). */
export const CHAUFFEUR_TIERS = [
  {
    id: "regular",
    label: "Regular Chauffeur",
    description: "Professional, licensed chauffeur — Lagos or interstate",
    rate12: 50000,
    rate24: 80000,
  },
  {
    id: "spy_police",
    label: "Spy Police Chauffeur",
    description: "Certified police officer with security training",
    rate12: 70000,
    rate24: 120000,
  },
] as const;

/** Which vehicles suit which trips, for recommendations. */
export const TRIP_VEHICLE_AFFINITY: Record<string, string[]> = {
  airport_pickup: ["prado_2020", "gx460_2020", "prado_2022", "gx460_2022"],
  airport_dropoff: ["prado_2020", "gx460_2020", "prado_2022", "gx460_2022"],
  "12hrs": ["prado_2020", "prado_2022", "gx460_2020"],
  "24hrs": ["prado_2020", "prado_2022", "gx460_2020", "gx460_2022"],
  multiple_days: ["prado_2020", "prado_2022", "gx460_2020"],
  interstate: ["prado_2020", "prado_2022", "hilux_2022"],
  wedding_event: ["gx460_2022", "gx460_2020", "prado_2022"],
  corporate: ["prado_2022", "gx460_2020", "gx460_2022"],
  vip_security: ["gx460_2022", "hilux_2022", "prado_2022"],
};
