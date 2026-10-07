import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { db, DEMO_PROFILES } from '../db/repository.js';
import { UserProfile, UserRole } from '../../../shared/schemas.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const xRole = req.headers['x-user-role'] as string | undefined;
    const xUserId = req.headers['x-user-id'] as string | undefined;

    // 1. Check for Demo User ID or Demo Role Header (supports instant role testing & UI role switching)
    if (xUserId) {
      const profile = await db.getProfileById(xUserId);
      if (profile) {
        req.user = profile;
        return next();
      }
    }

    if (xRole) {
      const normalizedRole = xRole.toUpperCase() as UserRole;
      const demoUser = DEMO_PROFILES.find(p => p.role === normalizedRole) || DEMO_PROFILES[0];
      req.user = demoUser;
      return next();
    }

    // 2. Check for Authorization Bearer Header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // Handle convenience demo tokens
      if (token === 'demo-employee') {
        req.user = DEMO_PROFILES[0];
        return next();
      } else if (token === 'demo-approver') {
        req.user = DEMO_PROFILES[1];
        return next();
      } else if (token === 'demo-admin') {
        req.user = DEMO_PROFILES[2];
        return next();
      }

      // Verify real Supabase JWT
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          let profile = await db.getProfileById(user.id);
          if (!profile) {
            // Profile fallback
            profile = {
              id: user.id,
              email: user.email || 'user@company.com',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: (user.user_metadata?.role as UserRole) || 'EMPLOYEE',
              department: user.user_metadata?.department || 'Operations',
              created_at: user.created_at,
              updated_at: new Date().toISOString()
            };
          }
          req.user = profile;
          return next();
        }
      } catch (jwtErr) {
        // Fall through to default fallback
      }
    }

    // Default to primary Employee demo user for frictionless immediate usage
    req.user = DEMO_PROFILES[0];
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Authentication failed', message: err.message });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Forbidden: Insufficient privileges.',
        requiredRoles: allowedRoles,
        currentRole: req.user.role 
      });
      return;
    }

    next();
  };
}
