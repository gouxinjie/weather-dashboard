/**
 * @component TopBar
 * @description 顶部状态栏 - 显示城市名、时间、数据更新、天气摘要、AQI 和预警状态
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import type { OverviewData } from '../../../types';
import { AQI_CATEGORY_COLORS, SEVERITY_COLORS } from '../../../constants';
import './index.scss';

/** Props 定义 */
interface TopBarProps {
  /** 首页概览数据 */
  overview: OverviewData;
  /** 点击城市名称回调（打开抽屉） */
  onCityClick: () => void;
}

/**
 * 格式化当前时间
 * @returns 格式化后的时间字符串
 */
function formatCurrentTime(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const wd = weekDays[now.getDay()];
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${wd} ${h}:${min}`;
}

/**
 * 顶部状态栏组件
 */
export function TopBar({ overview, onCityClick }: TopBarProps): JSX.Element {
  const { location, weatherNow, airNow, alertSummary } = overview;
  const aqiColor = AQI_CATEGORY_COLORS[airNow.category] || '#9DA5A6';
  const alertColor = alertSummary.highestSeverity
    ? SEVERITY_COLORS[alertSummary.highestSeverity] || '#D96C3F'
    : undefined;

  return (
    <header className="top-bar">
      {/* 城市信息 */}
      <div className="top-bar__city" onClick={onCityClick} role="button" tabIndex={0}>
        <span className="top-bar__city-icon">📍</span>
        <span className="top-bar__city-name">{location.name}</span>
        <span className="top-bar__city-arrow">▼</span>
      </div>

      {/* 日期时间 */}
      <div className="top-bar__datetime">{formatCurrentTime()}</div>

      {/* 天气摘要 */}
      <div className="top-bar__summary">
        <span className="top-bar__temp">{weatherNow.temp}°</span>
        <span className="top-bar__text">{weatherNow.text}</span>
      </div>

      {/* 数据更新时间 */}
      <div className="top-bar__update">
        更新于 {formatObsTime(weatherNow.obsTime)}
      </div>

      {/* AQI 状态 */}
      <div className="top-bar__aqi" style={{ color: aqiColor }}>
        <span className="top-bar__aqi-label">AQI</span>
        <span className="top-bar__aqi-value">{airNow.aqi}</span>
        <span className="top-bar__aqi-category">{airNow.category}</span>
      </div>

      {/* 预警状态 */}
      <div className="top-bar__alert" style={{ color: alertColor }}>
        {alertSummary.hasAlert ? (
          <>
            <span className="top-bar__alert-icon">⚠</span>
            <span className="top-bar__alert-text">
              {alertSummary.count}条预警
              {alertSummary.highestSeverity && (
                <span className="top-bar__alert-severity">
                  {alertSummary.highestSeverity}预警
                </span>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="top-bar__alert-icon safe">✓</span>
            <span className="top-bar__alert-text safe">暂无预警</span>
          </>
        )}
      </div>
    </header>
  );
}

/**
 * 格式化观测时间
 * @param obsTime ISO 时间字符串
 * @returns 短时间格式
 */
function formatObsTime(obsTime: string): string {
  if (!obsTime) return '--';
  try {
    const d = new Date(obsTime);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '--';
  }
}
