import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  MasterDataUploadDraft,
  MasterDataUploadLog,
} from '../../shared/types';

type Clock = () => Date;
type IdFactory = () => string;

export class JsonMasterDataUploadLogStore {
  constructor(
    private readonly filePath: string,
    private readonly now: Clock = () => new Date(),
    private readonly createId: IdFactory = () => randomUUID(),
  ) {}

  async list(): Promise<MasterDataUploadLog[]> {
    try {
      const contents = await readFile(this.filePath, 'utf8');
      const logs = JSON.parse(contents) as MasterDataUploadLog[];
      return [...logs].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }

  async append(draft: MasterDataUploadDraft): Promise<MasterDataUploadLog> {
    const log: MasterDataUploadLog = {
      ...draft,
      id: this.createId(),
      uploadedAt: this.now().toISOString(),
    };
    const current = await this.list();

    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify([log, ...current], null, 2), 'utf8');
    return log;
  }
}
