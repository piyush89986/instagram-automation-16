import axios from 'axios';
import { InstagramAccount } from '../../core/database/models/InstagramAccount';

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Send a simple text DM via the Messenger API
 */
export const sendTextMessage = async (instagramAccountId: string, recipientIgUserId: string, text: string) => {
  const account = await InstagramAccount.findOne({ instagramAccountId });
  if (!account) throw new Error('Instagram account not found');

  const token = account.pageAccessToken || account.accessToken;
  const pageId = account.metaAccountId;
  console.log(`📤 Sending DM via Page ${pageId}, token starts with: ${token?.substring(0, 10)}...`);

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
  const account = await InstagramAccount.findOne({ instagramAccountId });
  if (!account) throw new Error('Instagram account not found');

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
        params: { access_token: account.pageAccessToken || account.accessToken }
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
  const account = await InstagramAccount.findOne({ instagramAccountId });
  if (!account) throw new Error('Instagram account not found');

  try {
    const { data } = await axios.post(
      `${META_GRAPH_URL}/${commentId}/replies`,
      { message },
      {
        params: { access_token: account.pageAccessToken || account.accessToken }
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
  const account = await InstagramAccount.findOne({ instagramAccountId });
  if (!account) throw new Error('Instagram account not found');

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
        params: { access_token: account.pageAccessToken || account.accessToken }
      }
    );
    return data;
  } catch (error: any) {
    console.error('Failed to send Meta generic template message:', error.response?.data || error.message);
    throw error;
  }
};
