import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    const commonOptions = {
      maxRetriesPerRequest: 3,
      family: 4, // Force IPv4
    };

    if (redisUrl) {
      this.logger.log(`Connecting to Redis using REDIS_URL (host: ${redisUrl.split('@')[1]?.split(':')[0] || 'hidden'})`);
      this.client = new Redis(redisUrl, commonOptions);
    } else {
      this.logger.log(`Connecting to Redis using individual params (host: ${process.env.REDIS_HOST || 'localhost'})`);
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        ...commonOptions,
      });
    }

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error:', error);
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;

      if (options?.ttl) {
        await this.client.setex(fullKey, options.ttl, serializedValue);
      } else {
        await this.client.set(fullKey, serializedValue);
      }
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`Error getting keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  async flushdb(): Promise<boolean> {
    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      this.logger.error('Error flushing database:', error);
      return false;
    }
  }

  // Pub/Sub methods for real-time features
  async publish(channel: string, message: any): Promise<number> {
    try {
      const serializedMessage = JSON.stringify(message);
      return await this.client.publish(channel, serializedMessage);
    } catch (error) {
      this.logger.error(`Error publishing to channel ${channel}:`, error);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.subscribe(channel);

      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (parseError) {
            this.logger.error('Error parsing message:', parseError);
            callback(message);
          }
        }
      });
    } catch (error) {
      this.logger.error(`Error subscribing to channel ${channel}:`, error);
    }
  }

  // Hash operations for complex data structures
  async hset(key: string, field: string, value: any): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      const result = await this.client.hset(key, field, serializedValue);
      return result >= 0;
    } catch (error) {
      this.logger.error(`Error setting hash ${key}.${field}:`, error);
      return false;
    }
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting hash ${key}.${field}:`, error);
      return null;
    }
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    try {
      const hash = await this.client.hgetall(key);
      const result: Record<string, T> = {};

      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value as string);
        } catch {
          result[field] = value as T;
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Error getting all hash fields for ${key}:`, error);
      return {};
    }
  }

  // Session management for auth
  async setSession(sessionId: string, sessionData: any, ttl: number = 86400): Promise<boolean> {
    return this.set(`session:${sessionId}`, sessionData, { ttl });
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  }

  // Analytics caching
  async cacheAnalytics(key: string, data: any, ttl: number = 300): Promise<boolean> {
    return this.set(`analytics:${key}`, data, { ttl });
  }

  async getCachedAnalytics<T>(key: string): Promise<T | null> {
    return this.get<T>(`analytics:${key}`);
  }
}