import axios from 'axios';
import { InstagramAccount } from '../../core/database/models/InstagramAccount';

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Exchanges a short-lived token for a long-lived one (60 days)
 */
export const getLongLivedToken = async (shortLivedToken: string): Promise<string> => {
  try {
    const appId = process.env.META_APP_ID?.trim();
    const appSecret = process.env.META_APP_SECRET?.trim();

    if (!appId || !appSecret) {
      console.error(`CRITICAL: Missing App ID or Secret. AppID length: ${appId?.length}, Secret length: ${appSecret?.length}`);
      throw new Error('Backend environment variables (META_APP_ID or META_APP_SECRET) are missing or empty on Render.');
    }

    console.log(`DEBUG: Exchanging token. AppID: ${appId}, Secret length: ${appSecret.length}, Secret starts with: ${appSecret.substring(0, 4)}***`);

    const { data } = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      }
    });
    return data.access_token;
  } catch (error: any) {
    console.error('getLongLivedToken Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to get long lived token');
  }
};

/**
 * Scrapes FB pages to find linked IG Business/Creator accounts
 */
export const fetchLinkedInstagramAccounts = async (userAccessToken: string) => {
  try {
    const { data } = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: {
        fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}',
        access_token: userAccessToken
      }
    });

    const accounts = [];
    for (const page of data.data) {
      if (page.instagram_business_account) {
        if (!page.access_token) {
          throw new Error(`Missing Page Access Token for Page ${page.name}. Please re-connect and ensure you grant the "Manage and access Page conversations" and "Show list of Pages" permissions.`);
        }
        accounts.push({
          metaAccountId: page.id,
          pageAccessToken: page.access_token,
          instagramAccountId: page.instagram_business_account.id,
          username: page.instagram_business_account.username,
          profilePicUrl: page.instagram_business_account.profile_picture_url
        });
      }
    }
    return accounts;
  } catch (error: any) {
    console.error('fetchLinkedInstagramAccounts Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch linked Instagram accounts');
  }
};

export const connectAccounts = async (workspaceId: string, shortLivedToken: string) => {
  const longLivedToken = await getLongLivedToken(shortLivedToken);
  const igAccounts = await fetchLinkedInstagramAccounts(longLivedToken);

  if (igAccounts.length === 0) {
    // Fetch the raw data again just to throw it in the error for debugging
    const rawData = await axios.get(`${META_GRAPH_URL}/me/accounts`, {
      params: { fields: 'id,name', access_token: longLivedToken }
    }).then(r => r.data).catch(e => e.message);
    
    throw new Error(`Meta linked 0 Instagram accounts. Found Pages: ${JSON.stringify(rawData)}. Please ensure Instagram is a Professional Account AND linked to your Page in Facebook settings.`);
  }

  const savedAccounts = [];

  for (const acc of igAccounts) {
    const filter = { instagramAccountId: acc.instagramAccountId };
    const update = {
      workspaceId,
      metaAccountId: acc.metaAccountId,
      username: acc.username,
      profilePicUrl: acc.profilePicUrl,
      accessToken: longLivedToken,
      pageAccessToken: acc.pageAccessToken,
      isActive: true,
      deletedAt: null
    };

    const updatedAcc = await InstagramAccount.findOneAndUpdate(filter, update, { upsert: true, new: true });
    savedAccounts.push(updatedAcc);
    
    // Automatically subscribe this Facebook Page to our App's Webhooks
    try {
      await axios.post(`${META_GRAPH_URL}/${acc.metaAccountId}/subscribed_apps`, null, {
        params: {
          subscribed_fields: 'messages,messaging_postbacks',
          access_token: acc.pageAccessToken
        }
      });
      console.log(`✅ Successfully subscribed webhook for page ${acc.metaAccountId}`);
    } catch (err: any) {
      console.error(`❌ Failed to subscribe webhook for page ${acc.metaAccountId}:`, err.response?.data || err.message);
    }
  }

  return savedAccounts;
};
