import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';
import { saveUserProfileToFirestore } from '../services/firestore';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        isGuest: false,
      },
    });

    // Save profile to Firestore
    await saveUserProfileToFirestore({
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      isGuest: false,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });

    const token = jwt.sign(
      { id: user.id, displayName: user.displayName, email: user.email, isGuest: false },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isGuest: false,
      },
    });
  } catch (error: any) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sync profile with Firestore
    await saveUserProfileToFirestore({
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      isGuest: false,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });

    const token = jwt.sign(
      { id: user.id, displayName: user.displayName, email: user.email, isGuest: false },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isGuest: false,
      },
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Failed to authenticate user' });
  }
}

export async function createGuestSession(req: Request, res: Response) {
  try {
    const { displayName } = req.body;
    const name = displayName?.trim() || `Guest-${Math.floor(1000 + Math.random() * 9000)}`;

    const user = await prisma.user.create({
      data: {
        displayName: name,
        isGuest: true,
      },
    });

    // Sync guest profile with Firestore
    await saveUserProfileToFirestore({
      uid: user.id,
      displayName: user.displayName,
      isGuest: true,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });

    const token = jwt.sign(
      { id: user.id, displayName: user.displayName, isGuest: true },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        isGuest: true,
      },
    });
  } catch (error: any) {
    console.error('Guest Session Error:', error);
    return res.status(500).json({ error: 'Failed to create guest session' });
  }
}

export async function syncFirebaseUser(req: Request, res: Response) {
  try {
    const userId = req.body.id || req.body.uid;
    const email = req.body.email || null;
    const displayName = req.body.displayName || req.body.name || (email ? email.split('@')[0] : 'User');
    const photoURL = req.body.avatarUrl || req.body.photoURL || null;
    const isGuest = !!req.body.isGuest;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // 1. Try finding existing user by ID
    let user = await prisma.user.findUnique({ where: { id: userId } });

    // 2. If not found by ID, but email is provided, try finding existing user by email
    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (user) {
      // Check if updating email to `email` would conflict with another user
      let emailToUpdate: string | undefined = undefined;
      if (email && email !== user.email) {
        const emailOwner = await prisma.user.findUnique({ where: { email } });
        if (!emailOwner || emailOwner.id === user.id) {
          emailToUpdate = email;
        }
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          displayName,
          ...(emailToUpdate ? { email: emailToUpdate } : {}),
          ...(photoURL ? { avatarUrl: photoURL } : {}),
        },
      });
    } else {
      // Create new user, ensuring email is not already taken by someone else
      let finalEmail: string | undefined = undefined;
      if (email) {
        const existingWithEmail = await prisma.user.findUnique({ where: { email } });
        if (!existingWithEmail) {
          finalEmail = email;
        }
      }

      user = await prisma.user.create({
        data: {
          id: userId,
          displayName,
          email: finalEmail,
          avatarUrl: photoURL || undefined,
          isGuest,
        },
      });
    }

    const authRole = (req as AuthRequest).user?.role || (user as any).role || 'user';
    if ((user as any).role !== authRole) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: authRole },
      });
    }

    // Sync User Profile in Firestore
    await saveUserProfileToFirestore({
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.avatarUrl,
      isGuest: user.isGuest,
      role: (user as any).role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });

    return res.json({ user });
  } catch (error: any) {
    console.error('Sync Firebase User error:', error);
    return res.status(500).json({ error: 'Failed to sync user profile' });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({ user: req.user });
}
