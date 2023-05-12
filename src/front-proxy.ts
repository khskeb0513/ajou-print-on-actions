import express from 'express';
import axios from 'axios';

interface Tunnel {
  created_at: Date;
  hostport: string;
  id: string;
}

const app = express();
const port = process.env['PORT'] || 3000;
const blankBody = Buffer.from(
  '0100050100c93d7101470012617474726962757465732d6368617273657400057574662d3848001b617474726962757465732d6e61747572616c2d6c616e67756167650005656e2d757303',
  'hex',
);
const { NGROK_API_TOKEN } = process.env;

app.post('/', (_, res) => {
  return res
    .header('Proxy-Id', 'null')
    .header('Content-Type', 'application/ipp')
    .send(blankBody);
});

app.post('/:username', async (req, res) => {
  if (!req.params['username']) {
    return res
      .header('Proxy-Id', 'null')
      .header('Content-Type', 'application/ipp')
      .send(blankBody);
  }
  let endpoints = [] as Tunnel[];
  try {
    const endpointsResponse = await axios.get(
      'https://api.ngrok.com/endpoints',
      {
        headers: {
          'Ngrok-Version': '2',
          Authorization: 'Bearer ' + NGROK_API_TOKEN,
        },
      },
    );
    endpoints = endpointsResponse.data['endpoints'] as Tunnel[];
  } catch {
    return res
      .header('Proxy-Id', 'null')
      .header('Content-Type', 'application/ipp')
      .send(blankBody);
  }
  if (endpoints.length < 1) {
    return res
      .header('Proxy-Id', 'null')
      .header('Content-Type', 'application/ipp')
      .send(blankBody);
  }
  const endpoint = endpoints
    .map((v) => ({
      ...v,
      created_at: new Date(v.created_at),
    }))
    .sort((a, b) => b.created_at.valueOf() - a.created_at.valueOf())[0];
  try {
    const proxyResponse = await axios.post(
      'http://' + endpoint.hostport + '/' + req.params['username'],
      req.body,
      {
        headers: {
          'Content-Type': 'application/ipp',
        },
      },
    );
    return res
      .header('Proxy-Id', endpoint.id)
      .header('Content-Type', 'application/ipp')
      .send(proxyResponse.data);
  } catch {
    return res
      .header('Proxy-Id', endpoint.id + '.null')
      .header('Content-Type', 'application/ipp')
      .send(blankBody);
  }
});

app.listen(port, () => {
  console.log(`Port ${port} opened.`);
});
