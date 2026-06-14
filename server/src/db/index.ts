/**
 * @file 数据库连接与初始化
 * @description 管理 SQLite 数据库连接、初始化表结构
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../app/config';
import { logger } from '../utils/logger';

let db: Database.Database | null = null;

/**
 * 获取数据库实例（单例模式）
 * @returns 数据库连接实例
 */
export function getDb(): Database.Database {
  if (db) return db;

  // 确保数据库文件目录存在
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  logger.info('数据库连接已建立', { path: config.dbPath });
  return db;
}

/**
 * 初始化所有数据库表结构
 * @description 创建项目所需的所有表，如果表已存在则跳过
 */
export function initDatabase(): void {
  const database = getDb();

  // 创建城市信息表
  database.exec(`
    CREATE TABLE IF NOT EXISTS cities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      adm1 TEXT NOT NULL DEFAULT '',
      adm2 TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '中国',
      lat TEXT NOT NULL,
      lon TEXT NOT NULL,
      tz TEXT NOT NULL DEFAULT 'Asia/Shanghai',
      utc_offset TEXT NOT NULL DEFAULT '+08:00',
      type TEXT NOT NULL DEFAULT 'city',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // 创建实时天气快照表
  database.exec(`
    CREATE TABLE IF NOT EXISTS weather_now_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      obs_time TEXT NOT NULL,
      temp REAL NOT NULL DEFAULT 0,
      feels_like REAL NOT NULL DEFAULT 0,
      icon TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      wind_dir TEXT NOT NULL DEFAULT '',
      wind_scale TEXT NOT NULL DEFAULT '',
      wind_speed REAL NOT NULL DEFAULT 0,
      humidity REAL NOT NULL DEFAULT 0,
      precip REAL NOT NULL DEFAULT 0,
      pressure REAL NOT NULL DEFAULT 0,
      visibility REAL NOT NULL DEFAULT 0,
      cloud REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建逐小时天气快照表
  database.exec(`
    CREATE TABLE IF NOT EXISTS weather_hourly_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      fx_time TEXT NOT NULL,
      temp REAL NOT NULL DEFAULT 0,
      icon TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      pop REAL NOT NULL DEFAULT 0,
      wind_dir TEXT NOT NULL DEFAULT '',
      wind_scale TEXT NOT NULL DEFAULT '',
      wind_speed REAL NOT NULL DEFAULT 0,
      humidity REAL NOT NULL DEFAULT 0,
      pressure REAL NOT NULL DEFAULT 0,
      cloud REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建每日预报快照表
  database.exec(`
    CREATE TABLE IF NOT EXISTS weather_daily_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      fx_date TEXT NOT NULL,
      sunrise TEXT NOT NULL DEFAULT '',
      sunset TEXT NOT NULL DEFAULT '',
      temp_max REAL NOT NULL DEFAULT 0,
      temp_min REAL NOT NULL DEFAULT 0,
      icon_day TEXT NOT NULL DEFAULT '',
      text_day TEXT NOT NULL DEFAULT '',
      icon_night TEXT NOT NULL DEFAULT '',
      text_night TEXT NOT NULL DEFAULT '',
      precip REAL NOT NULL DEFAULT 0,
      humidity REAL NOT NULL DEFAULT 0,
      pressure REAL NOT NULL DEFAULT 0,
      uv_index TEXT NOT NULL DEFAULT '',
      wind_dir_day TEXT NOT NULL DEFAULT '',
      wind_scale_day TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建分钟级降水快照表
  database.exec(`
    CREATE TABLE IF NOT EXISTS minutely_precip_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      fx_time TEXT NOT NULL,
      precip REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'none',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建实时空气质量快照表
  database.exec(`
    CREATE TABLE IF NOT EXISTS air_now_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      pub_time TEXT NOT NULL,
      aqi REAL NOT NULL DEFAULT 0,
      level TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      primary_pollutant TEXT NOT NULL DEFAULT '',
      pm2p5 REAL NOT NULL DEFAULT 0,
      pm10 REAL NOT NULL DEFAULT 0,
      no2 REAL NOT NULL DEFAULT 0,
      so2 REAL NOT NULL DEFAULT 0,
      o3 REAL NOT NULL DEFAULT 0,
      co REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建空气质量小时预报快照表
  database.exec(`
    CREATE TABLE IF NOT EXISTS air_hourly_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      fx_time TEXT NOT NULL,
      aqi REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT '',
      primary_pollutant TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建预警表
  database.exec(`
    CREATE TABLE IF NOT EXISTS weather_alerts (
      id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      sender_name TEXT NOT NULL DEFAULT '',
      pub_time TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      headline TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      instruction TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (id, location_id),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建生活指数表
  database.exec(`
    CREATE TABLE IF NOT EXISTS weather_indices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建日统计表
  database.exec(`
    CREATE TABLE IF NOT EXISTS weather_stats_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      stat_date TEXT NOT NULL,
      max_temp REAL,
      min_temp REAL,
      avg_temp REAL,
      precipitation REAL NOT NULL DEFAULT 0,
      weather_type TEXT NOT NULL DEFAULT '',
      aqi_avg REAL,
      sample_count INTEGER NOT NULL DEFAULT 0,
      expected_count INTEGER NOT NULL DEFAULT 0,
      is_partial INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(location_id, stat_date),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建周统计表
  database.exec(`
    CREATE TABLE IF NOT EXISTS weather_stats_weekly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      avg_temp REAL,
      total_precipitation REAL NOT NULL DEFAULT 0,
      rainy_days INTEGER NOT NULL DEFAULT 0,
      aqi_avg REAL,
      weather_type_ratio TEXT NOT NULL DEFAULT '[]',
      sample_days INTEGER NOT NULL DEFAULT 0,
      expected_days INTEGER NOT NULL DEFAULT 7,
      stats_status TEXT NOT NULL DEFAULT 'partial',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(location_id, week_start),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建月统计表
  database.exec(`
    CREATE TABLE IF NOT EXISTS weather_stats_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id TEXT NOT NULL,
      month TEXT NOT NULL,
      avg_temp REAL,
      total_precipitation REAL NOT NULL DEFAULT 0,
      rainy_days INTEGER NOT NULL DEFAULT 0,
      aqi_avg REAL,
      weather_type_ratio TEXT NOT NULL DEFAULT '[]',
      sample_days INTEGER NOT NULL DEFAULT 0,
      expected_days INTEGER NOT NULL DEFAULT 0,
      is_partial_month INTEGER NOT NULL DEFAULT 1,
      stats_mode TEXT NOT NULL DEFAULT 'partial_month',
      stats_status TEXT NOT NULL DEFAULT 'partial',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(location_id, month),
      FOREIGN KEY (location_id) REFERENCES cities(id)
    );
  `);

  // 创建同步日志表
  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      location_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'success',
      message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // 创建应用设置表
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // 创建索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_weather_now_location
      ON weather_now_snapshots(location_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_weather_hourly_location
      ON weather_hourly_snapshots(location_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_weather_daily_location
      ON weather_daily_snapshots(location_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_air_now_location
      ON air_now_snapshots(location_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_air_hourly_location
      ON air_hourly_snapshots(location_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_location
      ON weather_alerts(location_id);
    CREATE INDEX IF NOT EXISTS idx_indices_location
      ON weather_indices(location_id, date);
    CREATE INDEX IF NOT EXISTS idx_stats_daily_location
      ON weather_stats_daily(location_id, stat_date);
    CREATE INDEX IF NOT EXISTS idx_stats_weekly_location
      ON weather_stats_weekly(location_id, week_start);
    CREATE INDEX IF NOT EXISTS idx_stats_monthly_location
      ON weather_stats_monthly(location_id, month);
  `);

  logger.info('数据库表初始化完成');
}

/**
 * 关闭数据库连接
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('数据库连接已关闭');
  }
}
