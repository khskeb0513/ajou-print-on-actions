import { PrintQueue } from '@prisma/client';
import { execSync } from 'child_process';
import { tmpPath } from '../config/path.service.js';
import { updatePrintQueue } from '../print-queue/print-queue.repository.js';
import { JobStatus } from '../print-queue/job-status.enum.js';
import { Constants } from '../config/constants.js';
import { getPageLength } from './handle-common.service.js';
import { rimrafSync } from 'rimraf';

export const handlePdfService = async (printQueue: PrintQueue) => {
  const pdfPath = tmpPath([printQueue.queueId, 'pdf']);
  const pageLength = getPageLength(pdfPath);
  if (pageLength < 1) {
    rimrafSync(tmpPath([printQueue.queueId]));
    await updatePrintQueue(printQueue.queueId, {
      length: pageLength,
      jobStatus: JobStatus.DROP_BY_PAGE_LENGTH,
    });
    return;
  }
  await updatePrintQueue(printQueue.queueId, {
    length: pageLength,
    jobStatus: JobStatus.CONVERT_PRINT_FILE,
  });
  // const colorParameter = !printQueue.color
  //   ? '-o CNColorMode=mono'
  //   : '-o CNColorMode=color';
  const duplexParameter = !printQueue.duplex
    ? '-o CNDuplex=None'
    : '-o CNDuplex=DuplexFront';
  try {
    await execSync(
      `lp -d "${Constants.FILTER_PRINTER_NAME}" -o media=a4 ${duplexParameter} -U "${printQueue.queueId}" -t "${printQueue.jobName}" -c ${pdfPath}`,
    );
  } catch (e) {
    console.error(e);
  }
};
