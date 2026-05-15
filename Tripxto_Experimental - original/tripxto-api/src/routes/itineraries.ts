import { Router } from 'express';
import type { AuthedRequest } from '../middleware/authJwt.js';
import { authJwt, attachUser } from '../middleware/authJwt.js';
import { keyItinerary } from '../cache/cacheKeys.js';
import { bustItinerary } from '../cache/invalidate.js';
import { redisGet, redisSetex } from '../cache/redisClient.js';
import { REDIS_ITINERARY_TTL_SEC } from '../config.js';
import { Itinerary } from '../models/Itinerary.js';

const router = Router();
router.use(authJwt);
router.use(attachUser);

router.get('/:tripClientId', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const tripClientId = Number(req.params.tripClientId);
  if (!Number.isFinite(tripClientId)) {
    res.status(400).json({ error: 'Invalid trip id' });
    return;
  }
  const cacheKey = keyItinerary(userId, tripClientId);
  const cached = await redisGet(cacheKey);
  if (cached) {
    res.set('X-Cache', 'HIT');
    res.type('application/json').send(cached);
    return;
  }
  const row = await Itinerary.findOne({ userId, tripClientId }).lean();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const body = JSON.stringify(row.document);
  await redisSetex(cacheKey, REDIS_ITINERARY_TTL_SEC, body);
  res.set('X-Cache', 'MISS');
  res.json(row.document);
});

router.put('/:tripClientId', async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const tripClientId = Number(req.params.tripClientId);
  if (!Number.isFinite(tripClientId)) {
    res.status(400).json({ error: 'Invalid trip id' });
    return;
  }
  const document = req.body?.document;
  if (document == null || typeof document !== 'object') {
    res.status(400).json({ error: 'document object required' });
    return;
  }
  await bustItinerary(userId, tripClientId);
  await Itinerary.findOneAndUpdate(
    { userId, tripClientId },
    { $set: { document } },
    { upsert: true, new: true },
  );
  res.status(204).send();
});

export { router as itinerariesRouter };
