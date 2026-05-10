export type PromoSlide = {
  type: string;
  title: string;
  description: string;
  buttonText: string;
  /** Left → right gradient stops (Tailwind-aligned) */
  gradient: readonly [string, string];
  imageQuery: string;
};

/** Same content as `project/trips.js` promoData */
export const PROMO_SLIDES: readonly PromoSlide[] = [
  {
    type: 'Product',
    title: 'Plan Smarter Travel with TripXto',
    description: 'Organize trips, manage itineraries and plan intelligently.',
    buttonText: 'Create Your First Trip',
    gradient: ['#2563eb', '#4f46e5'],
    imageQuery: 'travel',
  },
  {
    type: 'Feature Highlight',
    title: 'All Your Trips in One Dashboard',
    description: 'Track ongoing, upcoming and past trips in a clean interface.',
    buttonText: 'Explore Trips',
    gradient: ['#9333ea', '#db2777'],
    imageQuery: 'planning',
  },
  {
    type: 'Collaboration',
    title: 'Open for Travel Partnerships',
    description: 'TripXto welcomes collaboration with travel brands and creators.',
    buttonText: 'Partner With Us',
    gradient: ['#059669', '#0d9488'],
    imageQuery: 'hotel',
  },
] as const;
