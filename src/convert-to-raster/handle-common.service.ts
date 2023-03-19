import { execSync } from 'child_process';
import { readFileSync } from 'fs';

export const getPageLength = (path: string) => {
  const lengthInfoFilePath = path + '_bbox';
  try {
    execSync(
      `gs -dSAFER -dNOPAUSE -dBATCH -sDEVICE=bbox ${path} 2> ${lengthInfoFilePath}`,
    );
  } catch {
    /* empty */
  }
  return (
    readFileSync(lengthInfoFilePath).toString().split('%%BoundingBox').length -
    1
  );
};
