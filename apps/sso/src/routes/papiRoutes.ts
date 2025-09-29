/**
 * PAPI (Polkadot API) Routes
 * Following the same patterns as GoogleAuth and TelegramAuth routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Database } from 'sqlite';
import { createLogger } from '../utils/logger.js';
import { getPAPIService } from '../services/papiService.js';
import { AuditService } from '../services/auditService.js';
import { Client } from '../types/auth.js';
import { RateLimiters } from '../middleware/rateLimit.js';
import { sanitizeRequest, validateQuery, validateBody } from '../middleware/validation.js';
import { papiSchemas } from '../types/papi.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ValidationError, NotFoundError, ChainNotSupportedError } from '../utils/errors.js';
import { getValidatedEnv } from '../utils/envValidation.js';

const logger = createLogger('papi-routes');

export async function createPAPIRouter(
  auditService: AuditService,
  clients: Map<string, Client>,
  db: Database,
  rateLimiters: RateLimiters
): Promise<Router> {
  const router = Router();

  let papiService;
  try {
    const env = getValidatedEnv();
    if (!env.PAPI_ENABLED) {
      logger.info('PAPI service disabled via configuration');
      router.use((req, res, next) => {
        res.status(503).json({
          error: 'PAPI service is not available',
          message: 'PAPI integration is disabled via configuration',
        });
      });
      return router;
    }

    papiService = getPAPIService();
    // Initialize the service synchronously
    try {
      await papiService.initialize();
    } catch (error) {
      logger.error('Failed to initialize PAPI service', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return a router that shows an error for all routes
      router.use((req, res, next) => {
        res.status(503).json({
          error: 'PAPI service initialization failed',
          message: 'PAPI service could not be initialized',
        });
      });
      return router;
    }
  } catch (error) {
    logger.error('Failed to initialize PAPI Service', {
      error: error instanceof Error ? error.message : String(error),
    });
    router.use((req, res, next) => {
      res.status(503).json({
        error: 'PAPI service is not available',
        message: 'PAPI configuration is missing or invalid',
      });
    });
    return router;
  }

  router.get(
    '/chains',
    rateLimiters.api,
    sanitizeRequest(),
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = req.query.client_id as string;
      
      if (!clientId || !clients.has(clientId)) {
        return res.status(400).json({
          error: 'Invalid client',
          message: 'Valid client_id is required',
        });
      }

      try {
        const chains = await papiService.getEnabledChains();
        
        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_chains',
          status: 'success',
          details: { chainsCount: chains.length },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.json({
          success: true,
          data: chains,
          timestamp: Date.now(),
        });
      } catch (error) {
        logger.error('Failed to get chains', {
          error: error instanceof Error ? error.message : String(error),
        });

        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_chains',
          status: 'failure',
          details: { error: error instanceof Error ? error.message : String(error) },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.status(500).json({
          error: 'Failed to get chains',
          message: 'Internal server error',
        });
      }
    })
  );

  router.get(
    '/chains/:chainName',
    rateLimiters.api,
    sanitizeRequest(),
    validateQuery(papiSchemas.chainQuery),
    asyncHandler(async (req: Request, res: Response) => {
      const { chainName } = req.params;
      const clientId = req.query.client_id as string;
      
      if (!clientId || !clients.has(clientId)) {
        return res.status(400).json({
          error: 'Invalid client',
          message: 'Valid client_id is required',
        });
      }

      try {
        const chainInfo = await papiService.getChainInfo(chainName);
        
        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_chain_info',
          status: 'success',
          details: { chain: chainName },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.json({
          success: true,
          data: chainInfo,
          timestamp: Date.now(),
        });
      } catch (error) {
        if (error instanceof ChainNotSupportedError) {
          await auditService.log({
            type: 'API_ACCESS',
            user_address: req.ip || 'unknown',
            client_id: clientId,
            action: 'get_chain_info',
            status: 'failure',
            details: { chain: chainName, error: 'Chain not supported' },
            ip_address: req.ip || 'unknown',
            user_agent: req.get('User-Agent'),
          });

          return res.status(404).json({
            error: 'Chain not supported',
            message: `Chain '${chainName}' is not supported or not available`,
          });
        }

        logger.error('Failed to get chain info', {
          chain: chainName,
          error: error instanceof Error ? error.message : String(error),
        });

        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_chain_info',
          status: 'failure',
          details: { chain: chainName, error: error instanceof Error ? error.message : String(error) },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.status(500).json({
          error: 'Failed to get chain info',
          message: 'Internal server error',
        });
      }
    })
  );

  router.get(
    '/chains/:chainName/balance/:address',
    rateLimiters.api,
    sanitizeRequest(),
    validateQuery(papiSchemas.balanceQuery),
    asyncHandler(async (req: Request, res: Response) => {
      const { chainName, address } = req.params;
      const clientId = req.query.client_id as string;
      
      if (!clientId || !clients.has(clientId)) {
        return res.status(400).json({
          error: 'Invalid client',
          message: 'Valid client_id is required',
        });
      }

      try {
        const balance = await papiService.getBalance(chainName, address);
        
        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_balance',
          status: 'success',
          details: { chain: chainName, address: address.substring(0, 10) + '...' },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.json({
          success: true,
          data: balance,
          timestamp: Date.now(),
        });
      } catch (error) {
        if (error instanceof ChainNotSupportedError) {
          await auditService.log({
            type: 'API_ACCESS',
            user_address: req.ip || 'unknown',
            client_id: clientId,
            action: 'get_balance',
            status: 'failure',
            details: { chain: chainName, address: address.substring(0, 10) + '...', error: 'Chain not supported' },
            ip_address: req.ip || 'unknown',
            user_agent: req.get('User-Agent'),
          });

          return res.status(404).json({
            error: 'Chain not supported',
            message: `Chain '${chainName}' is not supported or not available`,
          });
        }

        logger.error('Failed to get balance', {
          chain: chainName,
          address: address.substring(0, 10) + '...',
          error: error instanceof Error ? error.message : String(error),
        });

        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_balance',
          status: 'failure',
          details: { chain: chainName, address: address.substring(0, 10) + '...', error: error instanceof Error ? error.message : String(error) },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.status(500).json({
          error: 'Failed to get balance',
          message: 'Internal server error',
        });
      }
    })
  );

  router.get(
    '/chains/:chainName/account/:address',
    rateLimiters.api,
    sanitizeRequest(),
    validateQuery(papiSchemas.accountInfoQuery),
    asyncHandler(async (req: Request, res: Response) => {
      const { chainName, address } = req.params;
      const clientId = req.query.client_id as string;
      
      if (!clientId || !clients.has(clientId)) {
        return res.status(400).json({
          error: 'Invalid client',
          message: 'Valid client_id is required',
        });
      }

      try {
        const accountInfo = await papiService.getAccountInfo(chainName, address);
        
        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_account_info',
          status: 'success',
          details: { chain: chainName, address: address.substring(0, 10) + '...' },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.json({
          success: true,
          data: accountInfo,
          timestamp: Date.now(),
        });
      } catch (error) {
        if (error instanceof ChainNotSupportedError) {
          await auditService.log({
            type: 'API_ACCESS',
            user_address: req.ip || 'unknown',
            client_id: clientId,
            action: 'get_account_info',
            status: 'failure',
            details: { chain: chainName, address: address.substring(0, 10) + '...', error: 'Chain not supported' },
            ip_address: req.ip || 'unknown',
            user_agent: req.get('User-Agent'),
          });

          return res.status(404).json({
            error: 'Chain not supported',
            message: `Chain '${chainName}' is not supported or not available`,
          });
        }

        logger.error('Failed to get account info', {
          chain: chainName,
          address: address.substring(0, 10) + '...',
          error: error instanceof Error ? error.message : String(error),
        });

        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_account_info',
          status: 'failure',
          details: { chain: chainName, address: address.substring(0, 10) + '...', error: error instanceof Error ? error.message : String(error) },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.status(500).json({
          error: 'Failed to get account info',
          message: 'Internal server error',
        });
      }
    })
  );

  router.get(
    '/status',
    rateLimiters.status,
    sanitizeRequest(),
    asyncHandler(async (req: Request, res: Response) => {
      const clientId = req.query.client_id as string;
      
      if (!clientId || !clients.has(clientId)) {
        return res.status(400).json({
          error: 'Invalid client',
          message: 'Valid client_id is required',
        });
      }

      try {
        const connectedChains = await papiService.getConnectedChains();
        
        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_status',
          status: 'success',
          details: { connectedChains: connectedChains.length },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.json({
          success: true,
          data: {
            service: 'PAPI',
            status: 'active',
            connectedChains: connectedChains.length,
            chains: connectedChains,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        });
      } catch (error) {
        logger.error('Failed to get PAPI status', {
          error: error instanceof Error ? error.message : String(error),
        });

        await auditService.log({
          type: 'API_ACCESS',
          user_address: req.ip || 'unknown',
          client_id: clientId,
          action: 'get_status',
          status: 'failure',
          details: { error: error instanceof Error ? error.message : String(error) },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('User-Agent'),
        });

        res.status(500).json({
          error: 'Failed to get status',
          message: 'Internal server error',
        });
      }
    })
  );

  return router;
}
