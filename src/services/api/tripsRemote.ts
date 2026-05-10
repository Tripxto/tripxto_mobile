import type { Trip } from '../../types/trip';

export async function fetchTripsRemote(baseUrl: string, jwt: string): Promise<Trip[]> {
  const res = await fetch(`${baseUrl}/api/v1/trips`, {
    headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`trips_remote_${res.status}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error('trips_remote_shape');
  return data as Trip[];
}

export async function createTripRemote(baseUrl: string, jwt: string, trip: Trip): Promise<Trip> {
  const res = await fetch(`${baseUrl}/api/v1/trips`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(trip),
  });
  if (!res.ok) {
    throw new Error(`trips_remote_create_${res.status}`);
  }
  return (await res.json()) as Trip;
}

export async function updateTripRemote(baseUrl: string, jwt: string, trip: Trip): Promise<Trip> {
  const res = await fetch(`${baseUrl}/api/v1/trips/${trip.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(trip),
  });
  if (!res.ok) {
    throw new Error(`trips_remote_update_${res.status}`);
  }
  return (await res.json()) as Trip;
}

export async function deleteTripRemote(baseUrl: string, jwt: string, tripId: number): Promise<void> {
  const res = await fetch(`${baseUrl}/api/v1/trips/${tripId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
  });
  if (res.status === 404) return;
  if (!res.ok) {
    throw new Error(`trips_remote_delete_${res.status}`);
  }
}
