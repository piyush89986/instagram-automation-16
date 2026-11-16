import { InstagramPost, IInstagramPost } from '../../core/database/models/InstagramPost';
import { PublishingJob } from '../../core/database/models/PublishingJob';
import { publishingQueue } from '../../config/queue';
import mongoose from 'mongoose';

export const createPost = async (data: Partial<IInstagramPost>) => {
  const isScheduled = !!data.scheduledTime;
  const post = new InstagramPost({
    ...data,
    status: isScheduled ? 'SCHEDULED' : 'DRAFT'
  });
  
  await post.save();

  if (isScheduled && data.workspaceId) {
    const delay = new Date(data.scheduledTime!).getTime() - Date.now();
    if (delay > 0) {
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
    }
  }

  return post;
};

export const publishPostNow = async (postId: mongoose.Types.ObjectId, workspaceId: string) => {
  const post = await InstagramPost.findOneAndUpdate(
    { _id: postId, workspaceId },
    { status: 'PUBLISHING' },
    { new: true }
  );

  if (!post) throw new Error('Post not found');

  const job = new PublishingJob({
    workspaceId,
    postId,
    status: 'QUEUED'
  });
  await job.save();

  // Add to BullMQ
  const bullJob = await publishingQueue.add('publish-post', {
    publishingJobId: job._id,
    postId: post._id,
    workspaceId
  });

  job.bullMqJobId = bullJob.id;
  await job.save();

  return { post, job };
};
