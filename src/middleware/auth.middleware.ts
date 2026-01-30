import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include the validated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username?: string;
        email?: string;
        role?: 'admin' | 'super_admin';
      };
    }
  }
}

export const validateTelegramAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization; // Expected: "tma <initData>"
  
  // DEBUG LOGS
  console.log('--- Auth Debug ---');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Authorization Header:', authHeader);
  console.log('------------------');

  // Development Bypass for easier Postman testing
  if (process.env.NODE_ENV === 'development' && authHeader === 'tma mock_user') {
    req.user = { id: '12345678', username: 'mock_tester' };
    return next();
  }

  if (!authHeader || !authHeader.startsWith('tma ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Telegram data' });
  }

  const initData = authHeader.substring(4);
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  // 1. Collect all data except the hash itself
  const data: { key: string; value: string }[] = [];
  urlParams.forEach((value, key) => {
    if (key !== 'hash') {
      data.push({ key, value });
    }
  });

  // 2. Sort alphabetically (Telegram requirement)
  data.sort((a, b) => a.key.localeCompare(b.key));

  // 3. Format into the data_check_string
  const dataCheckString = data.map(({ key, value }) => `${key}=${value}`).join('\n');

  // 4. Create Secret Key: HMAC-SHA256 of "WebAppData" with Bot Token
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.BOT_TOKEN || '')
    .digest();

  // 5. Compute the hash of our string
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // 6. Compare
  if (calculatedHash !== hash) {
    return res.status(403).json({ error: 'Invalid signature. Data may be tampered.' });
  }

  // 7. Success! Extract user info and move to next step
  const userString = urlParams.get('user');
  if (userString) {
    const user = JSON.parse(userString);
    req.user = { id: user.id.toString(), username: user.username };
  }

  next();
};

export const validateAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization; // Expected: "Bearer <token>"
  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
    }
  
    const token = authHeader.substring(7);
    
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment');
        }

        const decoded = jwt.verify(token, secret) as { id: string; email: string; role: 'admin' | 'super_admin' };
        
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
  };

export const validateAnyAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization; 
  
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing auth header' });
    }
  
    if (authHeader.startsWith('tma ')) {
        return validateTelegramAuth(req, res, next);
    } else if (authHeader.startsWith('Bearer ')) {
        return validateAdminAuth(req, res, next);
    } else {
        return res.status(401).json({ success: false, message: 'Unauthorized: Unsupported auth method' });
    }
};