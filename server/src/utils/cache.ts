/**
 * @file 缓存管理模块
 * @description 简单的内存缓存实现，按缓存键和过期时间管理数据
 */

interface CacheEntry<T> {
  data: T;
  expireAt: number;
}

/** 缓存存储 */
const store = new Map<string, CacheEntry<unknown>>();

/**
 * 从缓存中获取数据
 * @param key 缓存键
 * @returns 缓存数据或 null
 */
export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expireAt) {
    store.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * 将数据存入缓存
 * @param key 缓存键
 * @param data 要缓存的数据
 * @param ttlMs 过期时间（毫秒）
 */
export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, {
    data,
    expireAt: Date.now() + ttlMs,
  });
}

/**
 * 删除缓存
 * @param key 缓存键
 */
export function cacheDelete(key: string): void {
  store.delete(key);
}

/**
 * 按前缀删除缓存
 * @param prefix 缓存键前缀
 */
export function cacheDeleteByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/**
 * 清除所有缓存
 */
export function cacheClear(): void {
  store.clear();
}

/**
 * 获取缓存统计
 * @returns 缓存条目数量
 */
export function cacheStats(): { size: number } {
  // 清理过期条目
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expireAt) {
      store.delete(key);
    }
  }
  return { size: store.size };
}

/**
 * 生成缓存键
 * @param module 模块名
 * @param locationId 城市 ID
 * @returns 缓存键
 */
export function cacheKey(module: string, locationId: string): string {
  return `weather:${module}:${locationId}`;
}
