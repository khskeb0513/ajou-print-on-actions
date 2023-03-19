import { PrintQueue, Prisma } from '@prisma/client';
import { prismaClientService } from '../prisma-client.service.js';

export const createPrintQueue = async (params: {
  jobName: string;
  contentType: string;
  nickname: string;
  jobOriginatingUserName: string;
  color: boolean;
  duplex: boolean;
}): Promise<PrintQueue> => {
  const {
    jobName,
    contentType,
    nickname,
    jobOriginatingUserName,
    duplex,
    color,
  } = params;
  return prismaClientService.printQueue.create({
    data: {
      jobName,
      contentType,
      nickname,
      length: 0,
      jobOriginatingUserName,
      duplex,
      color,
    },
  });
};

export const updatePrintQueue = async (
  queueId: string,
  params: {
    length?: number;
    jobStatus?: string;
  },
): Promise<PrintQueue> => {
  const { jobStatus, length } = params;
  return prismaClientService.printQueue.update({
    where: {
      queueId,
    },
    data: {
      length,
      jobStatus,
    },
  });
};

export const findUniquePrintQueue = async (
  queueId: string,
): Promise<PrintQueue | null> => {
  return prismaClientService.printQueue.findUnique({
    where: {
      queueId,
    },
  });
};

export const findManyPrintQueue = async (params: {
  where?: Prisma.PrintQueueWhereInput;
  orderBy?: Prisma.PrintQueueOrderByWithRelationInput;
}): Promise<PrintQueue[]> => {
  const { where, orderBy } = params;
  return prismaClientService.printQueue.findMany({
    where,
    orderBy,
  });
};
