import { Request, Response, NextFunction } from 'express';
import { connectAccounts } from './oauth.service';
import { AuthRequest } from '../../core/middlewares/authMiddleware';
import { AppError } from '../../core/middlewares/errorHandler';
import { processWebhookEvent } from '../automation/automationEngine.service';
import { env } from '../../config/env';

// ---------- OAUTH & CONFIG ---------- //

export const getInstagramConfig = async (req: AuthRequest, res: Response) => {
  const appId = env.META_APP_ID || process.env.META_APP_ID || '';
  const configId = env.META_CONFIG_ID || process.env.META_CONFIG_ID || '';
  const hasServerToken = !!(env.META_ACCESS_TOKEN || env.META_ACESS_TOKEN || process.env.META_ACCESS_TOKEN || process.env.META_ACESS_TOKEN);

  res.status(200).json({
    status: 'success',
    data: {
      appId,
      configId,
      hasServerToken
    }
  });
};

export const connectUsingServerToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = env.META_ACCESS_TOKEN || env.META_ACESS_TOKEN || process.env.META_ACCESS_TOKEN || process.env.META_ACESS_TOKEN;
    if (!token) {
      return next(Object.assign(new Error('META_ACCESS_TOKEN is not configured in backend environment variables.'), { statusCode: 400, isOperational: true }));
    }

    const accounts = await connectAccounts(req.workspaceId as any, token);

    res.status(200).json({
      status: 'success',
      data: {
        accounts
      }
    });
  } catch (error: any) {
    const err = new Error('Failed to connect with server token: ' + error.message);
    (err as AppError).statusCode = 500;
    (err as AppError).isOperational = true;
    next(err);
  }
};

export const handleOAuthCallback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return next(Object.assign(new Error('Access token is required'), { statusCode: 400, isOperational: true }));
    }

    const accounts = await connectAccounts(req.workspaceId as any, accessToken);

    res.status(200).json({
      status: 'success',
      data: {
        accounts
      }
    });
  } catch (error: any) {
    const err = new Error('Failed to connect Meta account: ' + error.message);
    (err as AppError).statusCode = 500;
    (err as AppError).isOperational = true;
    next(err);
  }
};

export const getConnectedAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { InstagramAccount } = await import('../../core/database/models/InstagramAccount');
    const accounts = await InstagramAccount.find({ workspaceId: req.workspaceId, isActive: true }).select('-accessToken');
    res.status(200).json({ status: 'success', data: { accounts } });
  } catch (error: any) {
    next(error);
  }
};

// ---------- WEBHOOKS ---------- //

export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

export const handleWebhookEvent = async (req: Request, res: Response) => {
  const { object, entry } = req.body;
  console.log('🔔 RAW WEBHOOK RECEIVED:', JSON.stringify(req.body, null, 2));

  if (object === 'instagram' || object === 'page') {
    res.status(200).send('EVENT_RECEIVED');
    for (const ent of entry) {
      // Pipe the event directly into the core Automation Engine asynchronously
      processWebhookEvent(ent).catch(e => console.error('Engine processing error:', e));
    }
  } else {
    res.sendStatus(404);
  }
};
