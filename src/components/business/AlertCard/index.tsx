/**
 * @component AlertCard
 * @description 预警模块 - 展示当前生效的气象预警
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import type { AlertItem } from '../../../types';
import { SEVERITY_COLORS } from '../../../constants';
import './index.scss';

/** Props 定义 */
interface AlertCardProps {
  /** 预警数据列表 */
  alerts: AlertItem[];
}

/**
 * 预警模块组件
 * @description 展示预警类型、等级、发布时间和防护建议
 */
export function AlertCard({ alerts }: AlertCardProps): JSX.Element {
  const hasAlerts = alerts.length > 0;

  return (
    <div className="alert-card">
      <h3 className="alert-card__title">灾害预警</h3>

      {!hasAlerts ? (
        <div className="alert-card__empty">
          <span className="alert-card__empty-icon">✓</span>
          <span className="alert-card__empty-text">当前无预警</span>
          <span className="alert-card__empty-hint">城市天气状况正常</span>
        </div>
      ) : (
        <div className="alert-card__list">
          {alerts.map((alert) => {
            const color = SEVERITY_COLORS[alert.severity] || '#D96C3F';
            return (
              <div className="alert-card__item" key={alert.id} style={{ borderLeftColor: color }}>
                <div className="alert-card__header">
                  <span
                    className="alert-card__severity"
                    style={{ backgroundColor: color }}
                  >
                    {alert.severity}
                  </span>
                  <span className="alert-card__event">{alert.eventType}</span>
                </div>
                <div className="alert-card__body">
                  <p className="alert-card__headline">{alert.headline}</p>
                  <p className="alert-card__time">
                    发布：{formatTime(alert.publishedAt)} | 有效期至 {formatTime(alert.expireTime)}
                  </p>
                  <p className="alert-card__desc">{alert.description}</p>
                  {alert.instruction && (
                    <p className="alert-card__instruction">
                      <span className="alert-card__instruction-label">防护建议：</span>
                      {alert.instruction}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 格式化时间
 * @param timeStr ISO 时间字符串
 * @returns 格式化时间
 */
function formatTime(timeStr: string): string {
  if (!timeStr) return '--';
  try {
    const d = new Date(timeStr);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}-${day} ${h}:${min}`;
  } catch {
    return timeStr;
  }
}
