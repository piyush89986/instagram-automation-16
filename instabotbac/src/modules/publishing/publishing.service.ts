import axios from 'axios';
import { InstagramPost, IInstagramPost } from '../../core/database/models/InstagramPost';
import { PublishingJob } from '../../core/database/models/PublishingJob';
import { InstagramAccount } from '../../core/database/models/InstagramAccount';
import { publishingQueue } from '../../config/queue';
import redisConnection from '../../config/redis';
import mongoose from 'mongoose';

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const executePublishPost = async (postId: mongoose.Types.ObjectId | string, workspaceId?: string) => {
  const post = await InstagramPost.findById(postId);
  if (!post) throw new Error('Post not found');

  post.status = 'PUBLISHING';
  await post.save();

  // Try by MongoDB _id first, then fall back to instagramAccountId string, or workspace's active account
  let account = await InstagramAccount.findById(post.instagramAccountId).catch(() => null);
  if (!account) {
    account = await InstagramAccount.findOne({ instagramAccountId: post.instagramAccountId?.toString() });
  }
  if (!account && workspaceId) {
    account = await InstagramAccount.findOne({ workspaceId, isActive: true });
  }
  if (!account) {
    account = await InstagramAccount.findOne({ isActive: true });
  }
  if (!account) throw new Error('No active Instagram Account found to publish this post. Please connect your account first.');

  const { accessToken, pageAccessToken, instagramAccountId } = account;
  const tokenToUse = pageAccessToken || accessToken || process.env.META_ACCESS_TOKEN || process.env.META_ACESS_TOKEN;
  if (!tokenToUse) throw new Error('No valid Meta Access Token found for this account.');

  try {
    let containerId: string;
    if (post.postType === 'IMAGE') {
      const { data: createData } = await axios.post(`${META_GRAPH_URL}/${instagramAccountId}/media`, {
        image_url: post.mediaUrls[0],
        caption: post.caption,
        access_token: tokenToUse
      });
      containerId = createData.id;
    } else if (post.postType === 'REEL') {
      const { data: createData } = await axios.post(`${META_GRAPH_URL}/${instagramAccountId}/media`, {
        media_type: 'REELS',
        video_url: post.mediaUrls[0],
        caption: post.caption,
        access_token: tokenToUse
      });
      containerId = createData.id;
    } else if (post.postType === 'STORY') {
      const isVideo = post.mediaUrls[0]?.endsWith('.mp4') || post.mediaUrls[0]?.endsWith('.mov');
      const { data: createData } = await axios.post(`${META_GRAPH_URL}/${instagramAccountId}/media`, {
        media_type: 'STORIES',
        ...(isVideo ? { video_url: post.mediaUrls[0] } : { image_url: post.mediaUrls[0] }),
        access_token: tokenToUse
      });
      containerId = createData.id;
    } else if (post.postType === 'CAROUSEL') {
      const childrenIds = [];
      for (const url of post.mediaUrls) {
        const isVideo = url.endsWith('.mp4') || url.endsWith('.mov');
        const { data: childData } = await axios.post(`${META_GRAPH_URL}/${instagramAccountId}/media`, {
          is_carousel_item: true,
          ...(isVideo ? { media_type: 'VIDEO', video_url: url } : { image_url: url }),
          access_token: tokenToUse
        });
        childrenIds.push(childData.id);
      }
      const { data: carouselData } = await axios.post(`${META_GRAPH_URL}/${instagramAccountId}/media`, {
        media_type: 'CAROUSEL',
        children: childrenIds.join(','),
        caption: post.caption,
        access_token: tokenToUse
      });
      containerId = carouselData.id;
    } else {
      throw new Error(`Post type ${post.postType} is not supported`);
    }

    // Status Polling
    let isReady = false;
    let retries = 0;
    while (!isReady && retries < 15) {
      const { data: statusData } = await axios.get(`${META_GRAPH_URL}/${containerId}`, {
        params: { fields: 'status_code', access_token: tokenToUse }
      });
      if (statusData.status_code === 'FINISHED') {
        isReady = true;
      } else if (statusData.status_code === 'ERROR') {
        throw new Error('Meta media processing failed. Please ensure the media URL is public, direct, and meets Instagram specifications.');
      } else {
        await delay(3000);
        retries++;
      }
    }

    // Publish Container
    const { data: publishData } = await axios.post(`${META_GRAPH_URL}/${instagramAccountId}/media_publish`, {
      creation_id: containerId,
      access_token: tokenToUse
    });

    post.status = 'PUBLISHED';
    post.metaMediaId = publishData.id;
    await post.save();

    return { success: true, post, metaMediaId: publishData.id };
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error('❌ META PUBLISHING ERROR:', error.response?.data || error.message);
    post.status = 'FAILED';
    if (!post.errorLogs) post.errorLogs = [];
    post.errorLogs.push(errorMsg);
    await post.save();
    throw new Error(errorMsg);
  }
};

export const createPost = async (data: Partial<IInstagramPost>) => {
  const isScheduled = !!data.scheduledTime;
  const post = new InstagramPost({
    ...data,
    status: isScheduled ? 'SCHEDULED' : 'DRAFT'
  });
  
  await post.save();

  if (isScheduled && data.workspaceId) {
    const delay = new Date(data.scheduledTime!).getTime() - Date.now();
    if (delay > 0 && redisConnection && redisConnection.status === 'ready') {
      try {
        const job = new PublishingJob({
          workspaceId: data.workspaceId,
          postId: post._id,
          status: 'QUEUED'
        });
        await job.save();

        const bullJob = await publishingQueue.add('publish-post', {
          publishingJobId: job._id,
          postId: post._id,
          workspaceId: data.workspaceId
        }, { delay });

        job.bullMqJobId = bullJob.id;
        await job.save();
      } catch (e) {
        console.warn('Could not queue scheduled job to Redis:', e);
      }
    }
  }

  return post;
};

export const publishPostNow = async (postId: mongoose.Types.ObjectId, workspaceId: string) => {
  // If Redis is online, try queuing
  if (redisConnection && redisConnection.status === 'ready') {
    try {
      const job = new PublishingJob({
        workspaceId,
        postId,
        status: 'QUEUED'
      });
      await job.save();

      const bullJob = await publishingQueue.add('publish-post', {
        publishingJobId: job._id,
        postId,
        workspaceId
      });

      job.bullMqJobId = bullJob.id;
      await job.save();
      return { job };
    } catch (qErr) {
      console.warn('Queue submission failed, falling back to direct publishing:', qErr);
    }
  }

  // Fallback: Direct publishing without queue dependency
  return executePublishPost(postId, workspaceId);
};
