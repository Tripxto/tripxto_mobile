import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { DEV_RETURN_OTP, JWT_SECRET } from '../config.js';
import { Otp } from '../models/Otp.js';
import { User, toPublicUser } from '../models/User.js';
import { newId } from '../util/newId.js';

const router = Router();

function randomSixDigit(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.get('/status', async (req, res) => {
  const phoneE164 = String(req.query.phoneE164 ?? '').trim();
  if (!phoneE164) {
    res.status(400).json({ error: 'phoneE164 required' });
    return;
  }
  const u = await User.findOne({ phoneE164 });
  if (!u) {
    res.json({ status: 'new' });
    return;
  }
  if (!u.get('phoneVerified')) {
    res.json({ status: 'pending_verification' });
    return;
  }
  res.json({ status: 'verified' });
});

router.post('/pending-profile', async (req, res) => {
  const phoneE164 = String(req.body?.phoneE164 ?? '').trim();
  const p = req.body?.profile;
  if (!phoneE164 || !p) {
    res.status(400).json({ error: 'phoneE164 and profile required' });
    return;
  }
  const existing = await User.findOne({ phoneE164 });
  if (existing?.get('phoneVerified')) {
    res.status(409).json({ error: 'ALREADY_VERIFIED' });
    return;
  }
  const id = existing?.get('id') ?? newId();
  const fields = {
    id,
    phoneE164,
    firstName: String(p.firstName ?? '').trim(),
    lastName: String(p.lastName ?? '').trim(),
    email: String(p.email ?? '').trim().toLowerCase(),
    pincode: String(p.pincode ?? '').trim(),
    city: String(p.city ?? '').trim(),
    state: String(p.state ?? '').trim(),
    country: String(p.country ?? '').trim() || 'India',
    phoneVerified: false,
    status: 'active' as const,
  };
  if (existing) {
    existing.set(fields);
    await existing.save();
  } else {
    await User.create(fields);
  }
  res.json({ ok: true });
});

router.post('/send-otp', async (req, res) => {
  const phoneE164 = String(req.body?.phoneE164 ?? '').trim();
  if (!phoneE164) {
    res.status(400).json({ error: 'phoneE164 required' });
    return;
  }
  const code = randomSixDigit();
  await Otp.deleteMany({ phoneE164 });
  await Otp.create({ phoneE164, code });
  const body: { ok: true; devOtp?: string } = { ok: true };
  if (DEV_RETURN_OTP) body.devOtp = code;
  res.json(body);
});

router.post('/verify-otp', async (req, res) => {
  const phoneE164 = String(req.body?.phoneE164 ?? '').trim();
  const raw = String(req.body?.code ?? '');
  const code = raw.replace(/\D/g, '');
  if (!phoneE164 || code.length !== 6) {
    res.status(400).json({ error: 'phoneE164 and 6-digit code required' });
    return;
  }
  const row = await Otp.findOne({ phoneE164, code });
  if (!row) {
    res.status(400).json({ error: 'INVALID_OR_EXPIRED_OTP' });
    return;
  }
  await Otp.deleteMany({ phoneE164 });
  const user = await User.findOne({ phoneE164 });
  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND' });
    return;
  }
  user.set('phoneVerified', true);
  await user.save();
  const token = jwt.sign({ sub: user.get('id'), phoneE164 }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: toPublicUser(user) });
});

router.get('/me', async (req, res) => {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await User.findOne({ id: payload.sub });
    if (!user || !user.get('phoneVerified')) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/sign-out', (_req, res) => {
  res.status(204).send();
});

export { router as authRouter };
