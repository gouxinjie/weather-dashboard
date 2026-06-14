/**
 * @file 城市数据仓库
 * @description 城市信息的数据访问层，处理 cities 表的读写
 */

import { getDb } from '../db';
import type { CityRecord, QWeatherCityResult } from '../types';

/**
 * 按 ID 查找城市
 * @param locationId 城市 LocationID
 * @returns 城市记录或 undefined
 */
export function findCityById(locationId: string): CityRecord | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM cities WHERE id = ?');
  return stmt.get(locationId) as CityRecord | undefined;
}

/**
 * 按名称模糊搜索城市
 * @param keyword 搜索关键字
 * @param limit 返回数量限制
 * @returns 匹配的城市记录列表
 */
export function searchCitiesByName(keyword: string, limit: number = 20): CityRecord[] {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM cities WHERE name LIKE ? OR adm1 LIKE ? OR adm2 LIKE ? LIMIT ?'
  );
  const like = `%${keyword}%`;
  return stmt.all(like, like, like, limit) as CityRecord[];
}

/**
 * 插入或更新城市信息
 * @param city 和风天气城市数据
 */
export function upsertCity(city: QWeatherCityResult): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO cities (id, name, adm1, adm2, country, lat, lon, tz, utc_offset, type, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      adm1 = excluded.adm1,
      adm2 = excluded.adm2,
      country = excluded.country,
      lat = excluded.lat,
      lon = excluded.lon,
      tz = excluded.tz,
      utc_offset = excluded.utc_offset,
      type = excluded.type,
      updated_at = datetime('now', 'localtime')
  `);
  stmt.run(
    city.id,
    city.name,
    city.adm1 || '',
    city.adm2 || '',
    city.country || '中国',
    city.lat,
    city.lon,
    city.tz || 'Asia/Shanghai',
    city.utcOffset || '+08:00',
    city.type || 'city'
  );
}

/**
 * 批量插入或更新城市信息
 * @param cities 和风天气城市数据列表
 */
export function upsertCities(cities: QWeatherCityResult[]): void {
  const db = getDb();
  const insertStmt = db.prepare(`
    INSERT INTO cities (id, name, adm1, adm2, country, lat, lon, tz, utc_offset, type, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      adm1 = excluded.adm1,
      adm2 = excluded.adm2,
      country = excluded.country,
      lat = excluded.lat,
      lon = excluded.lon,
      tz = excluded.tz,
      utc_offset = excluded.utc_offset,
      type = excluded.type,
      updated_at = datetime('now', 'localtime')
  `);

  const transaction = db.transaction((cityList: QWeatherCityResult[]) => {
    for (const city of cityList) {
      insertStmt.run(
        city.id,
        city.name,
        city.adm1 || '',
        city.adm2 || '',
        city.country || '中国',
        city.lat,
        city.lon,
        city.tz || 'Asia/Shanghai',
        city.utcOffset || '+08:00',
        city.type || 'city'
      );
    }
  });

  transaction(cities);
}
