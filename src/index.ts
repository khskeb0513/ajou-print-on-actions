import { printer } from './servers/create-ipp-server.js';
import { findManyPrintQueue } from './print-queue/print-queue.repository.js';
import { JobStatus } from './print-queue/job-status.enum.js';
import { NgrokClient } from 'ngrok';
import * as ngrok from 'ngrok';
import axios from 'axios';

interface Tunnel {
  id: string;
  region: string;
  created_at: string;
  updated_at: string;
  public_url: string;
  proto: string;
  hostport: string;
  type: string;
}

const remainQueuesCount = async () =>
  (
    await findManyPrintQueue({
      where: {
        jobStatus: {
          in: [
            JobStatus.INITIAL_JOB_PARSING,
            JobStatus.CONVERT_PRINT_FILE,
            JobStatus.SEND_REMOTE,
          ],
        },
      },
    })
  ).length;

const bootstrap = async () => {
  await ngrok.authtoken(process.env.NGROK_AUTH_TOKEN as string);
  const ngrokClient = (await ngrok.getApi()) as NgrokClient;
  const ngrokTunnels = async (): Promise<Tunnel[]> =>
    (
      await axios.get('https://api.ngrok.com/endpoints', {
        headers: {
          'Ngrok-Version': '2',
          Authorization: 'Bearer ' + process.env.NGROK_API_TOKEN,
        },
      })
    ).data.endpoints;
  if ((await ngrokTunnels()).length > 1) {
    await ngrokClient.stopTunnel(
      (
        await ngrokTunnels()
      ).sort(
        (a, b) =>
          new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf(),
      )[0].id,
    );
  }
  const fetchNgrokUrl = await ngrok.connect({
    proto: 'tcp',
    addr: 3000,
    region:
      (await ngrokTunnels()).length > 0
        ? (await ngrokTunnels())[0].region === 'jp'
          ? 'ap'
          : 'jp'
        : 'jp',
  });
  console.log(fetchNgrokUrl);
  setInterval(async () => {
    if (
      Date.now() - printer.startedAt.valueOf() > 1000 * 60 * 10 &&
      (await remainQueuesCount()) === 0 &&
      (await ngrokTunnels()).length > 1
    ) {
      await ngrok.disconnect();
      await process.exit();
    }
  }, 1000);
};

printer.on('server-opened', (err) => {
  if (!err) {
    void bootstrap();
  } else {
    console.error(err);
  }
});
