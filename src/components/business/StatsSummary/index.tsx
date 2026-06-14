/**
 * @component StatsSummary
 * @description 统计摘要模块 - 展示周统计和月统计摘要
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import { useNavigate } from 'react-router-dom';
import type { WeeklyStats, MonthlyStats } from '../../../types';
import './index.scss';

/** Props 定义 */
interface StatsSummaryProps {
  /** 周统计数据 */
  weeklyStats: WeeklyStats;
  /** 月统计数据 */
  monthlyStats: MonthlyStats;
}

/**
 * 统计摘要组件
 * @description 展示本周和本月的天气统计摘要，可点击进入详情页
 */
export function StatsSummary({ weeklyStats, monthlyStats }: StatsSummaryProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="stats-summary">
      <div className="stats-summary__header">
        <h3 className="stats-summary__title">统计摘要</h3>
        <button
          className="stats-summary__more"
          onClick={() => navigate('/stats')}
          type="button"
        >
          详情 →
        </button>
      </div>

      <div className="stats-summary__grid">
        {/* 周统计 */}
        <div className="stats-summary__card">
          <div className="stats-summary__card-header">
            <span className="stats-summary__card-title">本周统计</span>
            <span className="stats-summary__card-date">
              {weeklyStats.weekStart} ~ {weeklyStats.weekEnd}
            </span>
          </div>
          <div className="stats-summary__metrics">
            <div className="stats-summary__metric">
              <span className="stats-summary__metric-label">平均气温</span>
              <span className="stats-summary__metric-value">
                {weeklyStats.avgTemp}°C
              </span>
            </div>
            <div className="stats-summary__metric">
              <span className="stats-summary__metric-label">累计降水</span>
              <span className="stats-summary__metric-value">
                {weeklyStats.totalPrecipitation}mm
              </span>
            </div>
            <div className="stats-summary__metric">
              <span className="stats-summary__metric-label">雨天数</span>
              <span className="stats-summary__metric-value">
                {weeklyStats.rainyDays} 天
              </span>
            </div>
            <div className="stats-summary__metric">
              <span className="stats-summary__metric-label">平均AQI</span>
              <span className="stats-summary__metric-value">
                {weeklyStats.aqiAvg}
              </span>
            </div>
          </div>
          {weeklyStats.statsStatus === 'partial' && (
            <div className="stats-summary__hint">数据不完整（{weeklyStats.sampleDays}/{weeklyStats.expectedDays}天）</div>
          )}
        </div>

        {/* 月统计 */}
        <div className="stats-summary__card">
          <div className="stats-summary__card-header">
            <span className="stats-summary__card-title">本月统计</span>
            <span className="stats-summary__card-date">{monthlyStats.month}</span>
          </div>
          <div className="stats-summary__metrics">
            <div className="stats-summary__metric">
              <span className="stats-summary__metric-label">平均气温</span>
              <span className="stats-summary__metric-value">
                {monthlyStats.avgTemp}°C
              </span>
            </div>
            <div className="stats-summary__metric">
              <span className="stats-summary__metric-label">累计降水</span>
              <span className="stats-summary__metric-value">
                {monthlyStats.totalPrecipitation}mm
              </span>
            </div>
            <div className="stats-summary__metric">
              <span className="stats-summary__metric-label">雨天数</span>
              <span className="stats-summary__metric-value">
                {monthlyStats.rainyDays} 天
              </span>
            </div>
            <div className="stats-summary__metric">
              <span className="stats-summary__metric-label">平均AQI</span>
              <span className="stats-summary__metric-value">
                {monthlyStats.aqiAvg}
              </span>
            </div>
          </div>
          {monthlyStats.isPartialMonth && (
            <div className="stats-summary__hint">
              ⚠ 统计样本期不足（{monthlyStats.sampleDays}/{monthlyStats.expectedDays}天）
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
