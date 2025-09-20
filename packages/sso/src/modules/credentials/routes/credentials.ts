import { Router } from 'express';
import { CredentialService } from '../services/credentialService';

export const createCredentialRouter = (credentialService: CredentialService) => {
  const router = Router();

  // Create credential
  router.post('/', async (req, res) => {
    try {
      const credential = await credentialService.createCredential(req.body);
      res.json(credential);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create credential' });
    }
  });

  // Get credential
  router.get('/:id', async (req, res) => {
    try {
      const credential = await credentialService.getCredential(req.params.id);
      res.json(credential);
    } catch (error) {
      res.status(404).json({ error: 'Credential not found' });
    }
  });

  // List credentials
  router.get('/', async (req, res) => {
    try {
      const credentials = await credentialService.listCredentials();
      res.json(credentials);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list credentials' });
    }
  });

  return router;
};
