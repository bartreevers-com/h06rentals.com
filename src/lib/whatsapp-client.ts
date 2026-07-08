/** Client-safe WhatsApp helpers (no database imports). */

export const WHATSAPP_NUMBER = "2349139999533";

export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const WA_PRESETS = {
  concierge: "Hello H06 Rentals! I'd like to speak with the concierge about a booking.",
  vip: (vehicleName?: string) =>
    `Hello H06 Rentals! I'd like to enquire about ${vehicleName ?? "an exotic or bespoke vehicle"}.\n\nOccasion / event:\nDate:\nPickup:\nDestination:\nNumber of guests:\n\nPlease advise on availability and pricing.`,
  corporate:
    "Hello H06 Rentals! I'd like to discuss a corporate account for executive transportation.\n\nCompany:\nTypical usage:\nContact person:",
};
