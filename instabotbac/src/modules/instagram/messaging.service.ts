import axios from 'axios';
import { InstagramAccount, IInstagramAccount } from '../../core/database/models/InstagramAccount';
import { env } from '../../config/env';

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

const getMetaToken = (account: IInstagramAccount | null): string => {
  return account?.pageAccessToken || account?.accessToken || env.META_ACCESS_TOKEN || env.META_ACESS_TOKEN || process.env.META_ACCESS_TOKEN || process.env.META_ACESS_TOKEN || '';
};

const findAccount = async (id: string) => {
  return InstagramAccount.findOne({
    $or: [
      { instagramAccountId: id },
      { metaAccountId: id }
    ]
  });
};

/**
 * Send a simple text DM via the Messenger API
 */
export const sendTextMessage = async (instagramAccountId: string, recipientIgUserId: string, text: string) => {
  const account = await findAccount(instagramAccountId);
  const token = getMetaToken(account);
  if (!account && !token) throw new Error('Instagram account or Meta Access Token not found');

  const pageId = account?.metaAccountId || 'me';
  console.log(`📤 Sending DM via Page ${pageId}, token starts with: ${token ? token.substring(0, 10) + '...' : 'NONE'}`);

  try {
    const { data } = await axios.post(
      `${META_GRAPH_URL}/me/messages`,
      {
        recipient: { id: recipientIgUserId },
        message: { text }
      },
      {
        params: { access_token: token }
      }
    );
    return data;
  } catch (error: any) {
    console.error('Failed to send Meta message:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send a media DM (Image, Video, Audio, File) via the Messenger API
 */
export const sendMediaMessage = async (instagramAccountId: string, recipientIgUserId: string, mediaUrl: string, mediaType: 'image' | 'video' | 'audio' | 'file') => {
  const account = await findAccount(instagramAccountId);
  const token = getMetaToken(account);
  if (!account && !token) throw new Error('Instagram account or Meta Access Token not found');

  try {
    const { data } = await axios.post(
      `${META_GRAPH_URL}/me/messages`,
      {
        recipient: { id: recipientIgUserId },
        message: {
          attachment: {
            type: mediaType,
            payload: {
              url: mediaUrl,
              is_reusable: true
            }
          }
        }
      },
      {
        params: { access_token: token }
      }
    );
    return data;
  } catch (error: any) {
    console.error('Failed to send Meta media message:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Reply publicly to an Instagram Comment
 */
export const replyToComment = async (instagramAccountId: string, commentId: string, message: string) => {
  const account = await findAccount(instagramAccountId);
  const token = getMetaToken(account);
  if (!account && !token) throw new Error('Instagram account or Meta Access Token not found');

  try {
    const { data } = await axios.post(
      `${META_GRAPH_URL}/${commentId}/replies`,
      { message },
      {
        params: { access_token: token }
      }
    );
    return data;
  } catch (error: any) {
    console.error('Failed to reply to comment:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send a Generic Template (Carousel/Cards) DM via the Messenger API
 */
export const sendGenericTemplate = async (instagramAccountId: string, recipientIgUserId: string, elements: any[]) => {
  const account = await findAccount(instagramAccountId);
  const token = getMetaToken(account);
  if (!account && !token) throw new Error('Instagram account or Meta Access Token not found');

  try {
    const { data } = await axios.post(
      `${META_GRAPH_URL}/me/messages`,
      {
        recipient: { id: recipientIgUserId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: elements
            }
          }
        }
      },
      {
        params: { access_token: token }
      }
    );
    return data;
  } catch (error: any) {
    console.error('Failed to send Meta generic template message:', error.response?.data || error.message);
    throw error;
  }
};
