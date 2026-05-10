import type { ItineraryDocument } from '../../types/itinerary';

export async function fetchItineraryRemote(
  baseUrl: string,
  jwt: string,
  tripClientId: number,
): Promise<ItineraryDocument | null> {
  const res = await fetch(`${baseUrl}/api/v1/itineraries/${tripClientId}`, {
    headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`itinerary_remote_${res.status}`);
  return (await res.json()) as ItineraryDocument;
}
