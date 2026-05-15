import { Router } from 'express';
import type { AuthedRequest } from '../middleware/authJwt.js';
import { authJwt, attachUser } from '../middleware/authJwt.js';
import { keyTripsList } from '../cache/cacheKeys.js';
import { bustTripsList, bustTripsListAndItinerary } from '../cache/invalidate.js';
import { redisGet, redisSetex } from '../cache/redisClient.js';
import { REDIS_TRIPS_LIST_TTL_SEC } from '../config.js';
import { Itinerary } from '../models/Itinerary.js';
import { Trip } from '../models/Trip.js';

const router = Router();
router.use(authJwt);
router.use(attachUser);

function toClientShape(doc: {
  clientId: number;
  destination: string;
  startDate: string;
  endDate: string;
  about?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  return {
    id: doc.clientId,
    destination: doc.destination,
    startDate: doc.startDate,
    endDate: doc.endDate,
    about: doc.about ?? undefined,
    title: doc.title ?? undefined,
    description: doc.description ?? undefined,
  };
}

router.get('/', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const cacheKey = keyTripsList(userId);
  const cached = await redisGet(cacheKey);
  if (cached) {
    res.set('X-Cache', 'HIT');
    res.type('application/json').send(cached);
    return;
  }
  const list = await Trip.find({ userId }).sort({ startDate: 1 }).lean();
  const payload = list.map((t) => toClientShape(t));
  const body = JSON.stringify(payload);
  await redisSetex(cacheKey, REDIS_TRIPS_LIST_TTL_SEC, body);
  res.set('X-Cache', 'MISS');
  res.json(payload);
});

router.post('/', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const body = req.body;
  const clientId = Number(body?.id);
  if (!body?.destination || !body?.startDate || !body?.endDate || !Number.isFinite(clientId)) {
    res.status(400).json({ error: 'id, destination, startDate, endDate required' });
    return;
  }
  try {
    const doc = await Trip.create({
      userId,
      clientId,
      destination: String(body.destination).trim(),
      startDate: String(body.startDate),
      endDate: String(body.endDate),
      about: body.about != null ? String(body.about) : undefined,
      title: body.title != null ? String(body.title) : undefined,
      description: body.description != null ? String(body.description) : undefined,
    });
    await bustTripsList(userId);
    res.status(201).json(toClientShape(doc.toObject()));
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      res.status(409).json({ error: 'Trip id already exists for this user' });
      return;
    }
    throw e;
  }
});

router.patch('/:tripId', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const tripId = Number(req.params.tripId);
  if (!Number.isFinite(tripId)) {
    res.status(400).json({ error: 'Invalid trip id' });
    return;
  }
  const body = req.body;
  const doc = await Trip.findOneAndUpdate(
    { userId, clientId: tripId },
    {
      $set: {
        ...(body.destination != null ? { destination: String(body.destination).trim() } : {}),
        ...(body.startDate != null ? { startDate: String(body.startDate) } : {}),
        ...(body.endDate != null ? { endDate: String(body.endDate) } : {}),
        ...(body.about != null ? { about: String(body.about) } : {}),
        ...(body.title != null ? { title: String(body.title) } : {}),
        ...(body.description != null ? { description: String(body.description) } : {}),
      },
    },
    { new: true },
  );
  if (!doc) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  await bustTripsListAndItinerary(userId, tripId);
  res.json(toClientShape(doc.toObject()));
});

router.delete('/:tripId', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const tripId = Number(req.params.tripId);
  if (!Number.isFinite(tripId)) {
    res.status(400).json({ error: 'Invalid trip id' });
    return;
  }
  const gone = await Trip.deleteOne({ userId, clientId: tripId });
  if (gone.deletedCount === 0) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  await Itinerary.deleteMany({ userId, tripClientId: tripId });
  await bustTripsListAndItinerary(userId, tripId);
  res.status(204).send();
});

export { router as tripsRouter };
