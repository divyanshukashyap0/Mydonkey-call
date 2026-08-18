import Redis from 'ioredis';

export class InMemoryRedisFallback {
  private store = new Map<string, string>();
  private ttls = new Map<string, number>();

  async get(key: string): Promise<string | null> {
    const expireTime = this.ttls.get(key);
    if (expireTime && Date.now() > expireTime) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      this.ttls.set(key, Date.now() + duration * 1000);
    } else if (mode === 'PX' && duration) {
      this.ttls.set(key, Date.now() + duration);
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    this.ttls.delete(key);
    return existed ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    const results: string[] = [];

    const now = Date.now();
    for (const [key, value] of Array.from(this.store.entries())) {
      const expireTime = this.ttls.get(key);
      if (expireTime && now > expireTime) {
        this.store.delete(key);
        this.ttls.delete(key);
        continue;
      }
      if (regex.test(key)) {
        results.push(key);
      }
    }

    return results;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const raw = (await this.get(key)) || '{}';
    let data: Record<string, string> = {};
    try {
      data = JSON.parse(raw);
    } catch {}
    data[field] = value;
    await this.set(key, JSON.stringify(data));
    return 1;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data[field] || null;
    } catch {
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const raw = await this.get(key);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    const raw = await this.get(key);
    if (!raw) return 0;
    try {
      const data = JSON.parse(raw);
      delete data[field];
      await this.set(key, JSON.stringify(data));
      return 1;
    } catch {
      return 0;
    }
  }
}

const fallbackStore = new InMemoryRedisFallback();
export let redisClient: any = fallbackStore;
export let isRedisConnected = false;

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

if (process.env.REDIS_URL) {
  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });

    client.on('connect', () => {
      isRedisConnected = true;
      redisClient = client;
      console.log('🔴 Redis Client Connected Successfully');
    });

    client.on('error', (err) => {
      isRedisConnected = false;
      redisClient = fallbackStore;
    });
  } catch {
    redisClient = fallbackStore;
  }
}

export async function getRedis(): Promise<any> {
  return redisClient || fallbackStore;
}
