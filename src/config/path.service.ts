import { mkdirSync } from 'fs';
import { join } from 'path';

mkdirSync('/tmp/ajou-print/', {
  recursive: true,
});

export const tmpPath = (subpaths: string[]) => {
  return join('/tmp/ajou-print/', ...subpaths);
};
