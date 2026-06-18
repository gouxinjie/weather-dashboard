/**
 * @file 天气数据仓库
 * @description 天气相关数据的数据访问层
 */

import { getDb } from '../db';
import type {
  WeatherNowSnapshot,
  AirNowSnapshot,
  WeatherAlert,
  WeatherIndex,
  QWeatherHourlyItem,
  QWeatherDailyItem,
  QWeatherAirHourlyItem,
  QWeatherMinutelyItem,
} from '../types';

// ==================== 天气快照 ====================

/**
 * 插入实时天气快照
 * @param snapshot 天气快照数据
 */
export function insertWeatherNowSnapshot(snapshot: Omit<WeatherNowSnapshot, 'id' | 'created_at'>): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO weather_now_snapshots
      (location_id, obs_time, temp, feels_like, icon, text, wind_dir, wind_scale,
       wind_speed, humidity, precip, pressure, visibility, cloud)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    snapshot.location_id,
    snapshot.obs_time,
    snapshot.temp,
    snapshot.feels_like,
    snapshot.icon,
    snapshot.text,
    snapshot.wind_dir,
    snapshot.wind_scale,
    snapshot.wind_speed,
    snapshot.humidity,
    snapshot.precip,
    snapshot.pressure,
    snapshot.visibility,
    snapshot.cloud
  );
}

/**
 * 获取最新的实时天气快照
 * @param locationId 城市 LocationID
 * @returns 最新天气快照或 undefined
 */
export function getLatestWeatherNow(locationId: string): WeatherNowSnapshot | undefined {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM weather_now_snapshots WHERE location_id = ? ORDER BY created_at DESC LIMIT 1'
  );
  return stmt.get(locationId) as WeatherNowSnapshot | undefined;
}

/**
 * 获取指定日期范围内的实时天气快照
 * @param locationId 城市 LocationID
 * @param startDate 开始日期，格式 yyyy-MM-dd
 * @param endDate 结束日期，格式 yyyy-MM-dd
 * @returns 天气快照列表
 */
export function getWeatherNowHistoryRange(
  locationId: string,
  startDate: string,
  endDate: string
): WeatherNowSnapshot[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_now_snapshots
    WHERE location_id = ?
      AND substr(obs_time, 1, 10) >= ?
      AND substr(obs_time, 1, 10) <= ?
    ORDER BY obs_time ASC
  `);
  return stmt.all(locationId, startDate, endDate) as WeatherNowSnapshot[];
}

// ==================== 逐小时快照 ====================

/**
 * 批量插入逐小时天气快照
 * @param locationId 城市 LocationID
 * @param items 逐小时天气列表
 */
export function insertHourlySnapshots(locationId: string, items: QWeatherHourlyItem[]): void {
  const db = getDb();
  // 先清除旧的逐小时数据
  db.prepare('DELETE FROM weather_hourly_snapshots WHERE location_id = ?').run(locationId);

  const stmt = db.prepare(`
    INSERT INTO weather_hourly_snapshots
      (location_id, fx_time, temp, icon, text, pop, wind_dir, wind_scale,
       wind_speed, humidity, pressure, cloud)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data: QWeatherHourlyItem[]) => {
    for (const item of data) {
      stmt.run(
        locationId,
        item.fxTime,
        parseFloat(item.temp) || 0,
        item.icon,
        item.text,
        parseFloat(item.pop) || 0,
        item.windDir,
        item.windScale,
        parseFloat(item.windSpeed) || 0,
        parseFloat(item.humidity) || 0,
        parseFloat(item.pressure) || 0,
        parseFloat(item.cloud) || 0
      );
    }
  });

  transaction(items);
}

/**
 * 获取最新的逐小时天气快照
 * @param locationId 城市 LocationID
 * @returns 逐小时天气列表
 */
export function getLatestHourly(locationId: string): QWeatherHourlyItem[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_hourly_snapshots
    WHERE location_id = ? AND created_at = (
      SELECT MAX(created_at) FROM weather_hourly_snapshots WHERE location_id = ?
    )
    ORDER BY fx_time ASC
  `);
  const rows = stmt.all(locationId, locationId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    fxTime: row.fx_time as string,
    temp: String(row.temp || '--'),
    icon: row.icon as string,
    text: row.text as string,
    pop: String(row.pop || '0'),
    windDir: row.wind_dir as string,
    windScale: row.wind_scale as string,
    windSpeed: String(row.wind_speed || '0'),
    humidity: String(row.humidity || '--'),
    pressure: String(row.pressure || '--'),
    cloud: String(row.cloud || '--'),
  }));
}

// ==================== 每日预报快照 ====================

/**
 * 批量插入每日预报快照
 * @param locationId 城市 LocationID
 * @param items 每日预报列表
 */
export function insertDailySnapshots(locationId: string, items: QWeatherDailyItem[]): void {
  const db = getDb();
  db.prepare('DELETE FROM weather_daily_snapshots WHERE location_id = ?').run(locationId);

  const stmt = db.prepare(`
    INSERT INTO weather_daily_snapshots
      (location_id, fx_date, sunrise, sunset, temp_max, temp_min, icon_day, text_day,
       icon_night, text_night, precip, humidity, pressure, uv_index, wind_dir_day, wind_scale_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data: QWeatherDailyItem[]) => {
    for (const item of data) {
      stmt.run(
        locationId,
        item.fxDate,
        item.sunrise,
        item.sunset,
        parseFloat(item.tempMax) || 0,
        parseFloat(item.tempMin) || 0,
        item.iconDay,
        item.textDay,
        item.iconNight,
        item.textNight,
        parseFloat(item.precip) || 0,
        parseFloat(item.humidity) || 0,
        parseFloat(item.pressure) || 0,
        item.uvIndex,
        item.windDirDay,
        item.windScaleDay
      );
    }
  });

  transaction(items);
}

/**
 * 获取最新的每日预报
 * @param locationId 城市 LocationID
 * @param limit 返回数量
 * @returns 每日预报列表
 */
export function getLatestDaily(locationId: string, limit: number = 7): QWeatherDailyItem[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_daily_snapshots
    WHERE location_id = ? AND created_at = (
      SELECT MAX(created_at) FROM weather_daily_snapshots WHERE location_id = ?
    )
    ORDER BY fx_date ASC
    LIMIT ?
  `);
  const rows = stmt.all(locationId, locationId, limit) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    fxDate: row.fx_date as string,
    sunrise: row.sunrise as string,
    sunset: row.sunset as string,
    tempMax: String(row.temp_max || '--'),
    tempMin: String(row.temp_min || '--'),
    iconDay: row.icon_day as string,
    textDay: row.text_day as string,
    iconNight: row.icon_night as string,
    textNight: row.text_night as string,
    precip: String(row.precip || '0.0'),
    humidity: String(row.humidity || '--'),
    pressure: String(row.pressure || '--'),
    uvIndex: String(row.uv_index || '--'),
    windDirDay: row.wind_dir_day as string,
    windScaleDay: row.wind_scale_day as string,
  }));
}

// ==================== 分钟级降水快照 ====================

/**
 * 批量插入分钟级降水快照
 * @param locationId 城市 LocationID
 * @param summary 降水摘要
 * @param items 分钟级降水列表
 */
export function insertMinutelySnapshots(
  locationId: string,
  summary: string,
  items: QWeatherMinutelyItem[]
): void {
  const db = getDb();
  db.prepare('DELETE FROM minutely_precip_snapshots WHERE location_id = ?').run(locationId);

  const stmt = db.prepare(`
    INSERT INTO minutely_precip_snapshots (location_id, summary, fx_time, precip, type)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data: QWeatherMinutelyItem[]) => {
    for (const item of data) {
      stmt.run(locationId, summary, item.fxTime, parseFloat(item.precip) || 0, item.type);
    }
  });

  transaction(items);
}

/**
 * 获取最新分钟级降水
 * @param locationId 城市 LocationID
 * @returns 分钟级降水数据
 */
export function getLatestMinutely(locationId: string): {
  summary: string;
  list: QWeatherMinutelyItem[];
} {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT DISTINCT summary, created_at FROM minutely_precip_snapshots
    WHERE location_id = ?
    ORDER BY created_at DESC LIMIT 1
  `);
  const latest = stmt.get(locationId) as { summary: string } | undefined;

  if (!latest) {
    return { summary: '', list: [] };
  }

  const itemsStmt = db.prepare(`
    SELECT * FROM minutely_precip_snapshots
    WHERE location_id = ? AND summary = ?
    ORDER BY fx_time ASC
  `);
  const rows = itemsStmt.all(locationId, latest.summary) as Array<Record<string, unknown>>;

  return {
    summary: latest.summary,
    list: rows.map((row) => ({
      fxTime: row.fx_time as string,
      precip: String(row.precip || '0'),
      type: row.type as string,
    })),
  };
}

// ==================== 空气质量快照 ====================

/**
 * 插入实时空气质量快照
 * @param snapshot 空气质量快照数据
 */
export function insertAirNowSnapshot(snapshot: Omit<AirNowSnapshot, 'id' | 'created_at'>): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO air_now_snapshots
      (location_id, pub_time, aqi, level, category, primary_pollutant,
       pm2p5, pm10, no2, so2, o3, co)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    snapshot.location_id,
    snapshot.pub_time,
    snapshot.aqi,
    snapshot.level,
    snapshot.category,
    snapshot.primary_pollutant,
    snapshot.pm2p5,
    snapshot.pm10,
    snapshot.no2,
    snapshot.so2,
    snapshot.o3,
    snapshot.co
  );
}

/**
 * 获取最新空气质量快照
 * @param locationId 城市 LocationID
 * @returns 最新空气质量快照或 undefined
 */
export function getLatestAirNow(locationId: string): AirNowSnapshot | undefined {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM air_now_snapshots WHERE location_id = ? ORDER BY created_at DESC LIMIT 1'
  );
  return stmt.get(locationId) as AirNowSnapshot | undefined;
}

/**
 * 获取过去 24 小时 AQI 快照
 * @param locationId 城市 LocationID
 * @returns AQI 历史列表
 */
export function getAirNowHistory24h(locationId: string): AirNowSnapshot[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM air_now_snapshots
    WHERE location_id = ? AND created_at >= datetime('now', 'localtime', '-24 hours')
    ORDER BY created_at ASC
  `);
  return stmt.all(locationId) as AirNowSnapshot[];
}

/**
 * 获取指定日期范围内的空气质量快照
 * @param locationId 城市 LocationID
 * @param startDate 开始日期，格式 yyyy-MM-dd
 * @param endDate 结束日期，格式 yyyy-MM-dd
 * @returns 空气质量快照列表
 */
export function getAirNowHistoryRange(
  locationId: string,
  startDate: string,
  endDate: string
): AirNowSnapshot[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM air_now_snapshots
    WHERE location_id = ?
      AND substr(pub_time, 1, 10) >= ?
      AND substr(pub_time, 1, 10) <= ?
    ORDER BY pub_time ASC
  `);
  return stmt.all(locationId, startDate, endDate) as AirNowSnapshot[];
}

// ==================== 空气质量小时预报快照 ====================

/**
 * 批量插入空气质量小时预报
 * @param locationId 城市 LocationID
 * @param items 空气质量小时预报列表
 */
export function insertAirHourlySnapshots(
  locationId: string,
  items: QWeatherAirHourlyItem[]
): void {
  const db = getDb();
  db.prepare('DELETE FROM air_hourly_snapshots WHERE location_id = ?').run(locationId);

  const stmt = db.prepare(`
    INSERT INTO air_hourly_snapshots (location_id, fx_time, aqi, category, primary_pollutant)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data: QWeatherAirHourlyItem[]) => {
    for (const item of data) {
      stmt.run(
        locationId,
        item.fxTime,
        parseFloat(item.aqi) || 0,
        item.category,
        item.primaryPollutant
      );
    }
  });

  transaction(items);
}

/**
 * 获取最新空气质量小时预报
 * @param locationId 城市 LocationID
 * @returns 空气质量小时预报列表
 */
export function getLatestAirHourly(locationId: string): QWeatherAirHourlyItem[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM air_hourly_snapshots
    WHERE location_id = ? AND created_at = (
      SELECT MAX(created_at) FROM air_hourly_snapshots WHERE location_id = ?
    )
    ORDER BY fx_time ASC
  `);
  const rows = stmt.all(locationId, locationId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    fxTime: row.fx_time as string,
    aqi: String(row.aqi || '--'),
    category: row.category as string,
    primaryPollutant: row.primary_pollutant as string,
  }));
}

// ==================== 预警 ====================

/**
 * 批量更新预警（先删后插）
 * @param locationId 城市 LocationID
 * @param alerts 预警列表
 */
export function upsertAlerts(locationId: string, alerts: WeatherAlert[]): void {
  const db = getDb();

  const transaction = db.transaction((data: WeatherAlert[]) => {
    // 清除该城市旧预警
    db.prepare('DELETE FROM weather_alerts WHERE location_id = ?').run(locationId);

    const stmt = db.prepare(`
      INSERT INTO weather_alerts
        (id, location_id, sender_name, pub_time, start_time, end_time,
         event_type, severity, headline, description, instruction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const alert of data) {
      stmt.run(
        alert.id,
        locationId,
        alert.sender_name,
        alert.pub_time,
        alert.start_time,
        alert.end_time,
        alert.event_type,
        alert.severity,
        alert.headline,
        alert.description,
        alert.instruction
      );
    }
  });

  transaction(alerts);
}

/**
 * 获取当前生效预警
 * @param locationId 城市 LocationID
 * @returns 预警列表
 */
export function getActiveAlerts(locationId: string): WeatherAlert[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_alerts
    WHERE location_id = ? AND end_time >= datetime('now', 'localtime')
    ORDER BY pub_time DESC
  `);
  return stmt.all(locationId) as WeatherAlert[];
}

// ==================== 生活指数 ====================

/**
 * 批量插入生活指数
 * @param locationId 城市 LocationID
 * @param indices 生活指数列表
 */
export function insertIndices(locationId: string, indices: WeatherIndex[]): void {
  const db = getDb();
  db.prepare('DELETE FROM weather_indices WHERE location_id = ?').run(locationId);

  const stmt = db.prepare(`
    INSERT INTO weather_indices (location_id, date, type, name, level, category, text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data: WeatherIndex[]) => {
    for (const item of data) {
      stmt.run(locationId, item.date, item.type, item.name, item.level, item.category, item.text);
    }
  });

  transaction(indices);
}

/**
 * 获取最新生活指数
 * @param locationId 城市 LocationID
 * @returns 生活指数列表
 */
export function getLatestIndices(locationId: string): WeatherIndex[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_indices
    WHERE location_id = ? AND created_at = (
      SELECT MAX(created_at) FROM weather_indices WHERE location_id = ?
    )
  `);
  return stmt.all(locationId, locationId) as WeatherIndex[];
}
