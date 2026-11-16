import { Queue, Worker, Processor } from 'bullmq';
import connection from './redis';

export const createQueue = (queueName: string) => {
  const queue = new Queue(queueName, { connection: connection as any });
  queue.on('error', () => {
    // Prevent unhandled BullMQ queue error crashing the process
  });
  return queue;
};

export const createWorker = (queueName: string, processor: Processor) => {
  const worker = new Worker(queueName, processor, { connection: connection as any });

  worker.on('error', () => {
    // Prevent unhandled BullMQ worker error crashing the process
  });

  worker.on('completed', (job) => {
    console.log(`Job [${queueName}] ID: ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job [${queueName}] ID: ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
};

// Example queues that will be used in the system
export const publishingQueue = createQueue('publishingQueue');
export const commentQueue = createQueue('commentQueue');
