import fs from 'fs/promises';
import path from 'path';
import { AppConfig } from '@/lib/store';

const CONFIG_FILE = path.join(process.cwd(), 'config.json');

export async function getServerConfig(): Promise<Partial<AppConfig> | null> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function saveServerConfig(config: Partial<AppConfig>): Promise<void> {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
