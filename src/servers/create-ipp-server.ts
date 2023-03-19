import { resolve } from 'path';
import { Printer } from './virtual-printer/printer/printer.js';
import mustacheExpress from 'mustache-express';
import router from './server-routing.js';
import { static as expressStatic } from 'express';
import { ContentType } from './content-type.enum.js';
import { mkdirSync, writeFileSync } from 'fs';
import { tmpPath } from '../config/path.service.js';
import {
  createPrintQueue,
  findUniquePrintQueue,
} from '../print-queue/print-queue.repository.js';
import { handlePdfService } from '../convert-to-raster/handle-pdf.service.js';
import { handlePsService } from '../convert-to-raster/handle-ps.service.js';
import { handeUfrService } from '../convert-to-raster/hande-ufr.service.js';
import { Constants } from '../config/constants.js';

export const printer = new Printer({
  name: Constants.PRINTER_NAME,
  description: Constants.PRINTER_DESCRIPTION,
  bonjour: false,
  format: [ContentType.PDF, ContentType.POSTSCRIPT],
  serverUrl: new URL(Constants.PRINTER_URL),
});

printer.on('data', async (handledJob, _, request) => {
  const contentType = request.headers['content-type'];
  if (contentType !== ContentType.IPP) {
    return;
  }
  if ((process.env.DEBUG || '').toUpperCase() === 'TRUE') {
    console.log(request.url, request.query);
  }
  // const searchParams = new URLSearchParams(request.url.split('?')[1]);
  // const color = searchParams.has('color');
  // const duplex = searchParams.has('duplex');
  const color = false,
    duplex = false;

  const buffer = Buffer.from(request.body);
  const sampleBuffer = buffer.subarray(0, 4096);

  // check it is ufr2 (end_byte 03, CDCA101000)
  let index = sampleBuffer.indexOf('03CDCA101000', 0, 'hex') + 1;
  if (index > 0) {
    const printQueue = await findUniquePrintQueue(
      handledJob['job-originating-user-name'],
    );
    if (!printQueue) return;
    mkdirSync(tmpPath([printQueue.queueId]), {
      recursive: true,
    });
    writeFileSync(tmpPath([printQueue.queueId, 'ufr']), buffer.subarray(index));
    return handeUfrService(printQueue);
  }

  const nickname = request.url
    .split('?')[0]
    .split('/')
    .filter((v) => Number(v) > 0)
    .pop();
  if (!nickname || String(nickname).length < 4) {
    return;
  }

  // check it is pdf (end_byte 03 %PDF- 255044462d)
  index = sampleBuffer.indexOf('03255044462d', 0, 'hex') + 1;
  if (index > 0) {
    const printQueue = await createPrintQueue({
      jobName: handledJob['job-name'],
      nickname: nickname,
      contentType: ContentType.PDF,
      jobOriginatingUserName: handledJob['job-originating-user-name'],
      color,
      duplex,
    });
    mkdirSync(tmpPath([printQueue.queueId]), {
      recursive: true,
    });
    writeFileSync(tmpPath([printQueue.queueId, 'pdf']), buffer.subarray(index));
    return handlePdfService(printQueue);
  }

  // check it is postscript (end_byte 03 %!PS- 252150532d)
  index = sampleBuffer.indexOf('03252150532d', 0, 'hex') + 1;
  if (index > 0) {
    const printQueue = await createPrintQueue({
      jobName: handledJob['job-name'],
      nickname: nickname,
      contentType: ContentType.POSTSCRIPT,
      jobOriginatingUserName: handledJob['job-originating-user-name'],
      duplex,
      color,
    });
    mkdirSync(tmpPath([printQueue.queueId]), {
      recursive: true,
    });
    writeFileSync(tmpPath([printQueue.queueId, 'ps']), buffer.subarray(index));
    return handlePsService(printQueue);
  }
});

printer.server.engine('mustache', mustacheExpress());
printer.server.engine(
  'mustache',
  mustacheExpress(resolve('packages/client/views/partials/'), '.mustache'),
);
printer.server.set('view engine', 'mustache');
printer.server.set('views', resolve('packages/client/views/'));
printer.server.use(router);
printer.server.use(
  '/static',
  expressStatic(resolve('packages/client/public/')),
);
