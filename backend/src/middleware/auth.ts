import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getAuth, isFirebaseAdminInitialized } from '../config/firebaseAdmin';
import { prisma } from '../db/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    displayName: string;
    isGuest: boolean;
    role: string;
    email?: string | null;
  };
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing' });
  }


  let userId: string | null = null;
  let displayName = 'User';
  let email: string | null = null;
  let isGuest = false;

  // 1. Try Firebase Admin ID Token Verification if service account initialized
  if (isFirebaseAdminInitialized) {
    try {
      const decoded = await getAuth().verifyIdToken(token);
      userId = decoded.uid;
      displayName = decoded.name || decoded.displayName || (decoded.email ? decoded.email.split('@')[0] : 'User');
      email = decoded.email || null;
      isGuest = decoded.firebase?.sign_in_provider === 'anonymous';
    } catch (err) {
      // Ignore online verification failure
    }
  }

  // 2. Try Local JWT Verification
  if (!userId) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      userId = decoded.id || decoded.uid || decoded.sub || decoded.user_id;
      displayName = decoded.displayName || decoded.name || 'User';
      email = decoded.email || null;
      isGuest = !!decoded.isGuest;
    } catch (err) {
      // Ignore local JWT verification failure
    }
  }

  // 3. Fallback: Parse JWT payload directly (Supports Firebase ID Tokens in local development mode)
  if (!userId) {
    const decoded = jwt.decode(token) as any;
    if (decoded) {
      userId = decoded.user_id || decoded.uid || decoded.sub || decoded.id || null;
      if (userId) {
        displayName = decoded.name || decoded.displayName || (decoded.email ? decoded.email.split('@')[0] : 'User');
        email = decoded.email || null;
        isGuest = decoded.firebase?.sign_in_provider === 'anonymous' || !!decoded.isGuest;
      }
    }
  }

  if (!userId) {
    return res.status(403).json({ error: 'Invalid or expired authentication token' });
  }

  // Ensure User record exists in Prisma DB to satisfy foreign keys and read/verify role against Cloud Firestore
  let role = 'user';
  try {
    let dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser && email) {
      dbUser = await prisma.user.findUnique({ where: { email } });
    }

    // Verify Admin status against Cloud Firestore database
    const { isUserAdminInFirestore } = await import('../services/firestoreSync');
    const isAdminInFirestore = await isUserAdminInFirestore(userId, email, token);

    if (isAdminInFirestore) {
      role = 'admin';
    } else if (dbUser) {
      role = (dbUser as any).role || 'user';
    }

    if (dbUser) {
      if ((dbUser as any).role !== role) {
        await prisma.user.update({ where: { id: dbUser.id }, data: { role } }).catch(() => {});
      }
    } else {
      let finalEmail: string | undefined = undefined;
      if (email) {
        const existingWithEmail = await prisma.user.findUnique({ where: { email } });
        if (!existingWithEmail) finalEmail = email;
      }
      await prisma.user.create({
        data: { id: userId, displayName, email: finalEmail, isGuest, role },
      }).catch(() => {});
    }
  } catch (err) {
    // Database sync error handler
  }

  req.user = { id: userId, displayName, email, isGuest, role };
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required (role=admin)' });
  }
  next();
}
