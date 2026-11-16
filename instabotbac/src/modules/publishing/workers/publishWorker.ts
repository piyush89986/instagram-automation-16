import { Job } from 'bullmq';
import axios from 'axios';
import { createWorker } from '../../../config/queue';
import { InstagramPost } from '../../../core/database/models/InstagramPost';
import { PublishingJob } from '../../../core/database/models/PublishingJob';
import { InstagramAccount } from '../../../core/database/models/InstagramAccount';

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const publishWorker = createWorker('publishingQueue', async (job: Job) => {
  const { publishingJobId, postId, workspaceId } = job.data;

  try {
    // 1. Update Job Status
    await PublishingJob.findByIdAndUpdate(publishingJobId, { status: 'PROCESSING', attempts: job.attemptsMade + 1 });

    const post = await InstagramPost.findById(postId);
    if (!post) throw new Error('Post not found');

    // Try by MongoDB _id first, then fall back to instagramAccountId string
    let account = await InstagramAccount.findById(post.instagramAccountId).catch(() => null);
    if (!account) {
      account = await InstagramAccount.findOne({ instagramAccountId: post.instagramAccountId?.toString() });
    }
    if (!account) throw new Error('Instagram Account not found for id: ' + post.instagramAccountId);

    const { accessToken, pageAccessToken, instagramAccountId } = account;
    // Meta API requires the PAGE Access Token (not user token) to publish to the linked IG account.
    const tokenToUse = pageAccessToken || accessToken || process.env.META_ACCESS_TOKEN || process.env.META_ACESS_TOKEN;

    // 2. Upload Media (Container Creation)
    // Simplified for IMAGE. Reels/Carousels require different endpoints/parameters
    let containerId;
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
      const isVideo = post.mediaUrls[0].endsWith('.mp4') || post.mediaUrls[0].endsWith('.mov');
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

    // 3. Status Polling (Crucial for Reels, less so for Images but good practice)
    let isReady = false;
    let retries = 0;
    while (!isReady && retries < 30) {
      const { data: statusData } = await axios.get(`${META_GRAPH_URL}/${containerId}`, {
        params: { fields: 'status_code', access_token: tokenToUse }
      });
      
      if (statusData.status_code === 'FINISHED') {
        isReady = true;
      } else if (statusData.status_code === 'ERROR') {
        // We could fetch the error message from statusData.status but let's keep it simple
        throw new Error('Meta container processing failed');
      } else {
        // IN_PROGRESS or PUBLISHED
        await delay(5000); // Wait 5 seconds before polling again
        retries++;
      }
    }

    if (!isReady) throw new Error('Meta container processing timed out');

    // 4. Publish Container
    const { data: publishData } = await axios.post(`${META_GRAPH_URL}/${instagramAccountId}/media_publish`, {
      creation_id: containerId,
      access_token: tokenToUse
    });

    // 5. Mark as Success
    await InstagramPost.findByIdAndUpdate(postId, { status: 'PUBLISHED', metaMediaId: publishData.id });
    await PublishingJob.findByIdAndUpdate(publishingJobId, { status: 'COMPLETED' });

    return { success: true, metaMediaId: publishData.id };

  } catch (error: any) {
    // Record Failure
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error('❌ META PUBLISHING ERROR:', error.response?.data || error.message);
    await PublishingJob.findByIdAndUpdate(publishingJobId, { status: 'FAILED', errorLog: errorMsg });
    await InstagramPost.findByIdAndUpdate(postId, { status: 'FAILED', $push: { errorLogs: errorMsg } });
    throw new Error(errorMsg); // Rethrow with the exact message so BullMQ logs it
  }
});
