import { printer } from './servers/create-ipp-server.js';
import { findManyPrintQueue } from './print-queue/print-queue.repository.js';
import { JobStatus } from './print-queue/job-status.enum.js';
import { NgrokClient } from 'ngrok';
import * as ngrok from 'ngrok';
import axios from 'axios';

type Region = 'us' | 'eu' | 'au' | 'ap' | 'sa' | 'jp' | 'in';
const regions = ['jp', 'ap', 'us', 'au', 'eu', 'in', 'sa'];

interface Tunnel {
  id: string;
  region: Region;
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
  const fetchNgrokTunnels = async (): Promise<Tunnel[]> =>
    (
      await axios.get('https://api.ngrok.com/endpoints', {
        headers: {
          'Ngrok-Version': '2',
          Authorization: 'Bearer ' + process.env.NGROK_API_TOKEN,
        },
      })
    ).data.endpoints;
  const tunnels = await fetchNgrokTunnels();
  if (tunnels.length > 1) {
    await ngrokClient.stopTunnel(
      tunnels.sort(
        (a, b) =>
          new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf(),
      )[0].id,
    );
  }
  const fetchNgrokUrl = await ngrok.connect({
    proto: 'tcp',
    addr: 3000,
    region: (regions.find(
      (regionCode) =>
        tunnels
          .map((tunnel) => tunnel.region)
          .findIndex((tunnelRegion) => tunnelRegion === regionCode) === -1,
    ) || 'jp') as Region,
  });
  console.log(fetchNgrokUrl);
  setInterval(async () => {
    try {
      if (
        Date.now() - printer.startedAt.valueOf() > 1000 * 60 * 10 &&
        (await remainQueuesCount()) === 0 &&
        (await fetchNgrokTunnels()).length > 1
      ) {
        await ngrok.disconnect();
        await console.log('ngrok tunnel closed');
        await process.exit(0);
      }
    } catch (e) {
      console.error(e);
    }
  }, 1000 * 10);
};

printer.on('server-opened', (err) => {
  if (!err) {
    void bootstrap();
  } else {
    console.error(err);
  }
});
