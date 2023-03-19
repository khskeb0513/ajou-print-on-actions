import axios from 'axios';
import { readFileSync } from 'fs';
import { PrintQueue } from '@prisma/client';
import { Constants } from '../config/constants.js';
import { tmpPath } from '../config/path.service.js';
import { updatePrintQueue } from '../print-queue/print-queue.repository.js';
import { JobStatus } from '../print-queue/job-status.enum.js';
import { v4 } from 'uuid';
import { rimrafSync } from 'rimraf';

export const getIpAddress = () =>
  '192.168.' +
  (Math.floor(Math.random() * 255) + 1).toString(10) +
  '.' +
  (Math.floor(Math.random() * 255) + 1).toString(10);

export const getMacAddress = () =>
  'XXXXXXXXXXXX'.replace(/X/g, () => {
    return '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16));
  });

export const sendRemote = async (printQueue: PrintQueue) => {
  const remoteQueueId = v4();
  try {
    await axios.post(
      'http://u-printon.canon-bs.co.kr:62301/nologin/regist_doc/',
      JSON.stringify({
        nonmember_id: printQueue.nickname,
        franchise: Constants.FRANCHISE_ID,
        pc_mac: getMacAddress(),
        docs: [
          {
            doc_name: printQueue.jobName,
            queue_id: remoteQueueId,
            pc_id: getIpAddress(),
            pages: [
              {
                size: 'A4',
                color: !printQueue.color ? 0 : 1,
                cnt: printQueue.length,
              },
            ],
          },
        ],
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': Constants.USER_AGENT_VALUE,
        },
      },
    );
    await axios.post(
      Constants.UPLOAD_BIN_URL,
      readFileSync(tmpPath([printQueue.queueId, 'ufr'])),
      {
        headers: {
          'Content-Type': 'application/X-binary',
          'Content-Disposition': `attachment;filename=${remoteQueueId}.prn`,
          'User-Agent': Constants.USER_AGENT_VALUE,
        },
      },
    );
    await updatePrintQueue(printQueue.queueId, {
      jobStatus: JobStatus.END,
    });
  } catch (e) {
    console.error(e);
    await updatePrintQueue(printQueue.queueId, {
      jobStatus: JobStatus.DROP_BY_HTTP_EXCEPTION,
    });
  } finally {
    if ((process.env.DEBUG || '').toUpperCase() === 'TRUE') {
      rimrafSync(tmpPath([printQueue.queueId]));
    }
  }
};
