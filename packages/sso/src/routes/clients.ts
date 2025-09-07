import { randomBytes, randomUUID } from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';

export const createClientRouter = () => {
  const router = Router();

  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, redirect_urls, allowed_origins } = req.body;

      if (!name || !redirect_urls || !allowed_origins) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const clientId = randomUUID();
      const clientSecret = randomBytes(32).toString('hex');

      // TODO: Create a ClientService to handle this operation
      res.json({
        client_id: clientId,
        client_secret: clientSecret,
        name,
        redirect_urls,
        allowed_origins,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
