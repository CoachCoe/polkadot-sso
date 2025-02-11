import { Router, Request, Response, NextFunction } from 'express';
import { Database } from 'sqlite';
import crypto from 'crypto';
//import { Client } from '../types/auth';

export const createClientRouter = (db: Database) => {
  const router = Router();

  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, redirect_urls, allowed_origins } = req.body;

      if (!name || !redirect_urls || !allowed_origins) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const clientId = crypto.randomUUID();
      const clientSecret = crypto.randomBytes(32).toString('hex');

      await db.run(
        `INSERT INTO clients (
          client_id, 
          client_secret, 
          name, 
          redirect_urls, 
          allowed_origins, 
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          clientId,
          clientSecret,
          name,
          JSON.stringify(redirect_urls),
          JSON.stringify(allowed_origins),
          Date.now(),
          Date.now()
        ]
      );

      res.json({
        client_id: clientId,
        client_secret: clientSecret,
        name,
        redirect_urls,
        allowed_origins
      });
    } catch (error) {
      next(error);
    }
  });

  // ... other client routes
  
  return router;
};
