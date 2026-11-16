import { Contact } from '../../core/database/models/Contact';
import { InstagramConversation } from '../../core/database/models/InstagramConversation';
import { InstagramMessage } from '../../core/database/models/InstagramMessage';
import { InstagramAccount } from '../../core/database/models/InstagramAccount';
import mongoose from 'mongoose';
import axios from 'axios';

export const getDashboardStats = async (workspaceId: string) => {
  const wsObjectId = new mongoose.Types.ObjectId(workspaceId);

  // 1. Total Leads (Contacts)
  const totalContacts = await Contact.countDocuments({ workspaceId: wsObjectId });

  // 2. Open Conversations
  const openConversations = await InstagramConversation.countDocuments({ 
    workspaceId: wsObjectId, 
    status: 'OPEN' 
  });

  // 3. AI Messages Sent (Automation & System_AI)
  const aiMessagesSent = await InstagramMessage.aggregate([
    {
      $lookup: {
        from: 'instagramconversations',
        localField: 'conversationId',
        foreignField: '_id',
        as: 'conversation'
      }
    },
    { $unwind: '$conversation' },
    {
      $match: {
        'conversation.workspaceId': wsObjectId,
        source: { $in: ['AUTOMATION', 'SYSTEM_AI'] }
      }
    },
    {
      $count: 'total'
    }
  ]);

  // 4. Messages over last 7 days (For Charting)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const messageTrend = await InstagramMessage.aggregate([
    {
      $lookup: {
        from: 'instagramconversations',
        localField: 'conversationId',
        foreignField: '_id',
        as: 'conversation'
      }
    },
    { $unwind: '$conversation' },
    {
      $match: {
        'conversation.workspaceId': wsObjectId,
        createdAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalMessages: { $sum: 1 },
        aiMessages: {
          $sum: {
            $cond: [{ $in: ['$source', ['AUTOMATION', 'SYSTEM_AI']] }, 1, 0]
          }
        },
        userMessages: {
          $sum: {
            $cond: [{ $eq: ['$source', 'INSTAGRAM'] }, 1, 0]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 5. Instagram Insights
  const account = await InstagramAccount.findOne({ workspaceId: wsObjectId });
  let insights = { followers: 0, reach: 0 };
  
  if (account && account.metaAccountId) {
    try {
      const { data } = await axios.get(`https://graph.facebook.com/v19.0/${account.metaAccountId}`, {
        params: {
          fields: 'followers_count',
          access_token: account.pageAccessToken || account.accessToken
        }
      });
      insights.followers = data.followers_count || 0;
      // Reach is complex to fetch via API without business login, using a placeholder
      insights.reach = insights.followers * 12; // Just a placeholder metric
    } catch (e) {
      console.error('Failed to fetch Instagram Insights:', e);
    }
  }

  return {
    overview: {
      totalContacts,
      openConversations,
      totalAiMessagesSent: aiMessagesSent.length > 0 ? aiMessagesSent[0].total : 0
    },
    trends: messageTrend,
    instagram: insights
  };
};
