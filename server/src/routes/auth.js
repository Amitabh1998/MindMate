import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
const signToken = (id) => jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const normalizeEmail = (s) => (s || '').trim().toLowerCase();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';
    console.log('REGISTER attempt:', email);

    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    console.log('REGISTER created:', user._id.toString(), user.email);

    const token = signToken(user.id);
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error('REGISTER error:', e);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';
    console.log('LOGIN attempt:', email);

    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) {
      console.log('LOGIN not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.log('LOGIN bad password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user.id);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error('LOGIN error:', e);
    return res.status(500).json({ message: 'Login failed' });
  }
});

// GET /api/auth/me (protected)
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('name email createdAt');
  res.json({ user });
});

export default router;
