/**
 * @component DailyForecast
 * @description 7 天天气预报
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import type { DailyItem } from '../../../types';
import { WeatherIcon } from '../../commons/WeatherIcon';
import './index.scss';

/** Props 定义 */
interface DailyForecastProps {
  /** 每日预报数据列表 */
  data: DailyItem[];
}

/**
 * 7 天天气预报组件
 * @description 横向展示未来 7 天的日期、天气、温度、降水等信息
 */
export function DailyForecast({ data }: DailyForecastProps): JSX.Element {
  return (
    <div className="daily-forecast">
      <h3 className="daily-forecast__title">7 天预报</h3>
      <div className="daily-forecast__list">
        {data.map((day, index) => (
          <div className="daily-forecast__item" key={day.fxDate}>
            <div className="daily-forecast__date">
              {index === 0 ? '今天' : index === 1 ? '明天' : formatDay(day.fxDate)}
            </div>
            <div className="daily-forecast__icons">
              <WeatherIcon
                code={day.iconDay}
                className="daily-forecast__day-icon"
                label={day.textDay}
              />
              <WeatherIcon
                code={day.iconNight}
                className="daily-forecast__night-icon"
                label={day.textNight}
              />
            </div>
            <div className="daily-forecast__text">
              <span className="daily-forecast__text-day">{day.textDay}</span>
              <span className="daily-forecast__text-night">{day.textNight}</span>
            </div>
            <div className="daily-forecast__temps">
              <span className="daily-forecast__temp-high">{day.tempMax}°</span>
              <span className="daily-forecast__temp-low">{day.tempMin}°</span>
            </div>
            <div className="daily-forecast__precip">
              {parseFloat(day.precip) > 0 ? (
                <span className="daily-forecast__precip-value">
                  💧 {day.precip}mm
                </span>
              ) : (
                <span className="daily-forecast__precip-none">--</span>
              )}
            </div>
            <div className="daily-forecast__wind">
              {day.windDirDay} {day.windScaleDay}级
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 格式化日期为周几
 * @param dateStr yyyy-MM-dd 格式日期
 * @returns 周几
 */
function formatDay(dateStr: string): string {
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr.slice(5);
  return weekDays[d.getDay()];
}
