import type { Trip, TripCategory } from '../types/trip';

export function filterTripsByCategory(trips: Trip[], category: TripCategory): Trip[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return trips.filter((trip) => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (category === 'Ongoing') return today >= start && today <= end;
    if (category === 'Upcoming') return today < start;
    return today > end;
  });
}
