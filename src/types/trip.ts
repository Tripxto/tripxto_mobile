/** Mirrors web `script.js` / `trips.js` localStorage shape */
export type Trip = {
  id: number;
  destination: string;
  startDate: string;
  endDate: string;
  about?: string;
  title?: string;
  description?: string;
};

export type TripCategory = 'Ongoing' | 'Upcoming' | 'Past';
