import { Printer } from '../printer/printer.js';
import ipp from 'ipp';
import {
  getJobs,
  getPrinterAttributes,
  printJob,
  validateJob,
} from './handle-request.js';
import { getResponder, ServiceEvent } from '@homebridge/ciao';
import { ParsedBodyInterface } from './interfaces/parsed-body.js';
import { createServer } from 'http';
import { chmodSync } from 'fs';

export function openServer(printer: Printer) {
  printer.server.post('*', (req, res) => {
    const buffers: Buffer[] = [];
    req
      .on('data', (chunk) => {
        buffers.push(Buffer.from(chunk));
      })
      .on('end', () => {
        let data = Buffer.from(
          '0100050100c93d7101470012617474726962757465732d6368617273657400057574662d3848001b617474726962757465732d6e61747572616c2d6c616e67756167650005656e2d757303',
          'hex',
        );
        req.body = Buffer.concat(buffers);
        let body = {} as ParsedBodyInterface;
        try {
          body = ipp.parse(req.body) as ParsedBodyInterface;
          switch (body.operation) {
            case 'Print-Job':
              data = printJob(printer, req, body);
              break;
            case 'Get-Jobs':
              data = getJobs(printer, body);
              break;
            case 'Get-Printer-Attributes':
              data = getPrinterAttributes(printer, body);
              break;
            case 'Validate-Job':
              data = validateJob(printer, body);
              break;
            default: {
              break;
            }
          }
        } catch (e) {
          /* empty */
        }
        res.header('Content-Type', 'application/ipp');
        res.send(data);
      });
  });

  if (printer.printerOption.serverUrl instanceof URL) {
    printer.server
      .listen(
        Number(printer.printerOption.serverUrl.port),
        printer.printerOption.serverUrl.hostname,
      )
      .on('error', (err) => {
        printer.emit('server-opened', err);
      })
      .on('listening', () => {
        printer.emit('server-opened', null);
      });
  } else {
    createServer(printer.server)
      .listen(printer.printerOption.serverUrl)
      .on('listening', () => {
        chmodSync(printer.printerOption.serverUrl, '777');
      })
      .on('error', (err) => {
        printer.emit('server-opened', err);
      });
  }

  if (
    printer.printerOption.serverUrl instanceof URL ||
    printer.printerOption.bonjour
  ) {
    const responder = getResponder();
    const service = responder.createService({
      name: printer.printerOption.name,
      type: 'ipp',
      port: Number((printer.printerOption.serverUrl as URL).port),
    });
    service.on(ServiceEvent.NAME_CHANGED, (name) => {
      printer.printerOption.name = name;
      printer.emit('bonjour-name-change', name);
    });
    service.on(ServiceEvent.HOSTNAME_CHANGED, (name) =>
      printer.emit('bonjour-hostname-change', name),
    );
    return service.advertise().then(() => printer.emit('bonjour-published'));
  }
}
