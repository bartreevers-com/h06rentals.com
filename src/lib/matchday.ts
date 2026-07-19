/**
 * Matchday mode — The Final, Sunday 19 July 2026.
 *
 * While active, the hero wears the campaign copy and the loading mark
 * grows into the H06 match ball. Auto-expires Monday 6:00 AM WAT, so
 * nothing needs reverting by hand.
 *
 * SOLIDARITY: set after the final whistle to the winning nation — the
 * loader dresses in their colours. Flip it, push, done.
 */
export const MATCHDAY_UNTIL = "2026-07-20T06:00:00+01:00";

export function isMatchday(): boolean {
  return Date.now() < new Date(MATCHDAY_UNTIL).getTime();
}

export interface Solidarity {
  name: string;
  colors: string[]; // flag colours, in band order
}

/** null until the winner is known. */
export const SOLIDARITY: Solidarity | null = null;
