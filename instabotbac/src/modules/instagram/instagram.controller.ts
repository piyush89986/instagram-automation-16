import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
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

export const simulateIncomingWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text, senderId } = req.body;
    const workspaceId = req.workspaceId;

    if (!text || !text.trim()) {
      return res.status(400).json({ status: 'error', message: 'Message text is required' });
    }

    const { InstagramAccount } = await import('../../core/database/models/InstagramAccount');
    let account = await InstagramAccount.findOne({ workspaceId, isActive: true });
    if (!account) {
      account = await InstagramAccount.findOne({ isActive: true });
    }
    if (!account) {
      return res.status(400).json({ status: 'error', message: 'No active Instagram Account found. Please connect your account in Settings first.' });
    }

    const testSenderId = senderId || 'sim_' + Date.now().toString().slice(-8);
    const mockMid = 'mid_sim_' + Date.now();

    const mockEvent = {
      id: account.instagramAccountId || account.metaAccountId,
      time: Date.now(),
      messaging: [
        {
          sender: { id: testSenderId },
          recipient: { id: account.instagramAccountId || account.metaAccountId },
          message: {
            mid: mockMid,
            text: text.trim()
          }
        }
      ]
    };

    console.log('🧪 Simulating webhook event:', mockEvent);
    await processWebhookEvent(mockEvent);

    res.status(200).json({
      status: 'success',
      message: 'Simulated DM processed successfully. Check your Inbox!',
      data: {
        account: account.username,
        senderId: testSenderId,
        text: text.trim()
      }
    });
  } catch (error: any) {
    next(error);
  }
};

export const syncConversationsInternal = async (workspaceId: any) => {
  const { InstagramAccount } = await import('../../core/database/models/InstagramAccount');
  const { InstagramConversation } = await import('../../core/database/models/InstagramConversation');
  const { InstagramMessage } = await import('../../core/database/models/InstagramMessage');
  const { Contact } = await import('../../core/database/models/Contact');

  let account = await InstagramAccount.findOne({ workspaceId, isActive: true });
  if (!account) {
    account = await InstagramAccount.findOne({ isActive: true });
  }
  if (!account) return { syncedCount: 0, messageCount: 0 };

  const token = account.pageAccessToken || account.accessToken || env.META_ACCESS_TOKEN || env.META_ACESS_TOKEN || process.env.META_ACCESS_TOKEN || process.env.META_ACESS_TOKEN;
  const igId = account.instagramAccountId;
  if (!token || !igId) return { syncedCount: 0, messageCount: 0 };

  const { data: convData } = await axios.get(
    `https://graph.facebook.com/v21.0/${igId}/conversations`,
    {
      params: {
        platform: 'instagram',
        fields: 'id,updated_time,participants,messages.limit(25){id,created_time,from,to,message}',
        access_token: token
      }
    }
  );

  const conversations = convData.data || [];
  let syncedCount = 0;
  let messageCount = 0;

  for (const c of conversations) {
    const lead = c.participants?.data?.find((p: any) => p.id !== igId);
    if (!lead || !lead.id) continue;

    let username = lead.username || `ig_user_${lead.id}`;
    let name = '';
    let profilePic = '';

    try {
      const { data: profile } = await axios.get(`https://graph.facebook.com/v21.0/${lead.id}`, {
        params: { fields: 'name,username,profile_pic', access_token: token }
      });
      if (profile.username) username = profile.username;
      if (profile.name) name = profile.name;
      if (profile.profile_pic) profilePic = profile.profile_pic;
    } catch (profErr) {}

    const contact = await Contact.findOneAndUpdate(
      { workspaceId, instagramUserId: lead.id },
      {
        $set: {
          workspaceId,
          instagramUserId: lead.id,
          username,
          name: name || lead.name || username,
          profilePicUrl: profilePic || undefined,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    const conversation = await InstagramConversation.findOneAndUpdate(
      { workspaceId, instagramAccountId: account._id, contactId: contact._id },
      {
        $set: {
          workspaceId,
          instagramAccountId: account._id,
          contactId: contact._id,
          lastMessageAt: c.updated_time ? new Date(c.updated_time) : new Date(),
          status: 'OPEN'
        }
      },
      { upsert: true, new: true }
    );

    syncedCount++;

    const msgs = (c.messages?.data || []).slice().reverse();
    for (const m of msgs) {
      if (!m.message && !m.id) continue;
      const isFromUser = m.from?.id === lead.id;

      try {
        await InstagramMessage.findOneAndUpdate(
          { metaMessageId: m.id },
          {
            $set: {
              conversationId: conversation._id,
              senderId: m.from?.id || lead.id,
              text: m.message || '',
              source: isFromUser ? 'INSTAGRAM' : 'SYSTEM_AI',
              messageType: 'DM',
              createdAt: m.created_time ? new Date(m.created_time) : new Date(),
              isRead: true
            }
          },
          { upsert: true, new: true }
        );
        messageCount++;
      } catch (msgErr) {}
    }
  }

  return { syncedCount, messageCount };
};

export const syncConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId;
    const result = await syncConversationsInternal(workspaceId);

    try {
      const { getIO } = await import('../../config/socket');
      getIO().to(workspaceId?.toString() as any).emit('conversation_updated', {});
    } catch (e) {}

    res.status(200).json({
      status: 'success',
      message: `Successfully synced ${result.syncedCount} conversations and ${result.messageCount} messages from Instagram!`,
      data: result
    });
  } catch (error: any) {
    next(error);
  }
};
