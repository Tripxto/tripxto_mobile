import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { MONGODB_URI, PORT } from './config.js';
import { authRouter } from './routes/auth.js';
import { itinerariesRouter } from './routes/itineraries.js';
import { tripsRouter } from './routes/trips.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, mongo: mongoose.connection.readyState === 1 });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/trips', tripsRouter);
app.use('/api/v1/itineraries', itinerariesRouter);

async function main() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`tripxto-api listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
