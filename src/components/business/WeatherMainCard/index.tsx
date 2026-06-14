/**
 * @component WeatherMainCard
 * @description 天气主模块 - 突出显示当前天气核心数据
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import type { WeatherNow, TodaySummary } from '../../../types';
import { WeatherIcon } from '../../commons/WeatherIcon';
import './index.scss';

/** Props 定义 */
interface WeatherMainCardProps {
  /** 实时天气数据 */
  weatherNow: WeatherNow;
  /** 今日摘要数据 */
  todaySummary: TodaySummary;
}

/**
 * 天气主模块组件
 * @description 居中展示当前温度、体感温度、天气现象、风向风力、湿度等核心指标
 */
export function WeatherMainCard({ weatherNow, todaySummary }: WeatherMainCardProps): JSX.Element {
  return (
    <div className="weather-main-card">
      {/* 当前温度 */}
      <div className="weather-main-card__hero">
        <div className="weather-main-card__temp-group">
          <span className="weather-main-card__current-temp">
            {weatherNow.temp}
            <span className="weather-main-card__unit">°C</span>
          </span>
          <span className="weather-main-card__feels-like">
            体感 {weatherNow.feelsLike}°
          </span>
        </div>
      </div>

      {/* 天气描述 */}
      <div className="weather-main-card__description">
        <WeatherIcon
          code={weatherNow.icon}
          className="weather-main-card__weather-icon"
          label={weatherNow.text}
        />
        <span className="weather-main-card__weather-text">
          {weatherNow.text}
        </span>
      </div>

      {/* 今日温度范围 */}
      <div className="weather-main-card__range">
        <span className="weather-main-card__range-high">
          ↑ {todaySummary.tempMax}°
        </span>
        <span className="weather-main-card__range-low">
          ↓ {todaySummary.tempMin}°
        </span>
      </div>

      {/* 指标网格 */}
      <div className="weather-main-card__metrics">
        <div className="weather-main-card__metric">
          <span className="weather-main-card__metric-label">风向风力</span>
          <span className="weather-main-card__metric-value">
            {weatherNow.windDir} {weatherNow.windScale}级
          </span>
        </div>
        <div className="weather-main-card__metric">
          <span className="weather-main-card__metric-label">风速</span>
          <span className="weather-main-card__metric-value">
            {weatherNow.windSpeed} km/h
          </span>
        </div>
        <div className="weather-main-card__metric">
          <span className="weather-main-card__metric-label">湿度</span>
          <span className="weather-main-card__metric-value">
            {weatherNow.humidity}%
          </span>
        </div>
        <div className="weather-main-card__metric">
          <span className="weather-main-card__metric-label">能见度</span>
          <span className="weather-main-card__metric-value">
            {weatherNow.vis} km
          </span>
        </div>
        <div className="weather-main-card__metric">
          <span className="weather-main-card__metric-label">气压</span>
          <span className="weather-main-card__metric-value">
            {weatherNow.pressure} hPa
          </span>
        </div>
        <div className="weather-main-card__metric">
          <span className="weather-main-card__metric-label">降水量</span>
          <span className="weather-main-card__metric-value">
            {weatherNow.precip} mm
          </span>
        </div>
        <div className="weather-main-card__metric">
          <span className="weather-main-card__metric-label">紫外线</span>
          <span className="weather-main-card__metric-value">
            {todaySummary.uvIndex}
          </span>
        </div>
        <div className="weather-main-card__metric">
          <span className="weather-main-card__metric-label">云量</span>
          <span className="weather-main-card__metric-value">
            {weatherNow.cloud}%
          </span>
        </div>
        <div className="weather-main-card__metric">
          <span className="weather-main-card__metric-label">日出/日落</span>
          <span className="weather-main-card__metric-value">
            {todaySummary.sunrise} / {todaySummary.sunset}
          </span>
        </div>
      </div>
    </div>
  );
}
