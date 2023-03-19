import { PrintQueue } from '@prisma/client';
import { updatePrintQueue } from '../print-queue/print-queue.repository.js';
import { JobStatus } from '../print-queue/job-status.enum.js';
import { sendRemote } from '../send-remote/send-remote.js';

export const handeUfrService = async (printQueue: PrintQueue) => {
  const updatedPrintQueue = await updatePrintQueue(printQueue.queueId, {
    jobStatus: JobStatus.SEND_REMOTE,
  });
  await sendRemote(updatedPrintQueue);
};
