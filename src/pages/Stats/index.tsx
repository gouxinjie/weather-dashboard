/**
 * @component Stats
 * @description 统计详情页 - 近 30 天温度、降水、AQI 趋势与统计明细
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import { api } from '../../utils/request';
import { useCityStore } from '../../stores/cityStore';
import type { DailyItem, AirHourlyItem, WeeklyStats, MonthlyStats } from '../../types';
import './index.scss';

/**
 * 统计详情页组件
 * @description 展示 30 天温度/降水/AQI 趋势图和周月统计明细
 */
export default function Stats(): JSX.Element {
  const navigate = useNavigate();
  const locationId = useCityStore((s) => s.locationId);
  const cityName = useCityStore((s) => s.cityName);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DailyItem[]>([]);
  const [airHourly, setAirHourly] = useState<AirHourlyItem[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);

  const tempChartRef = useRef<HTMLDivElement>(null);
  const precipChartRef = useRef<HTMLDivElement>(null);
  const aqiChartRef = useRef<HTMLDivElement>(null);

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dailyRes, airRes, weeklyRes, monthlyRes] = await Promise.all([
          api.getDaily(locationId, 30),
          api.getAirHourly(locationId),
          api.getWeeklyStats(locationId),
          api.getMonthlyStats(locationId),
        ]);
        setDailyData(dailyRes.list || []);
        setAirHourly(airRes.list || []);
        setWeeklyStats(weeklyRes);
        setMonthlyStats(monthlyRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : '数据加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [locationId]);

  // 温度趋势图
  useEffect(() => {
    if (!tempChartRef.current || dailyData.length === 0) return;
    const chart = echarts.init(tempChartRef.current);

    const dates = dailyData.map((d) => d.fxDate.slice(5));
    const highs = dailyData.map((d) => parseFloat(d.tempMax) || 0);
    const lows = dailyData.map((d) => parseFloat(d.tempMin) || 0);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#171D21',
        borderColor: '#283138',
        textStyle: { color: '#F2E9D8', fontSize: 12 },
      },
      legend: {
        data: ['最高温', '最低温'],
        bottom: 0,
        textStyle: { color: '#9DA5A6', fontSize: 11 },
      },
      grid: { top: 10, right: 20, bottom: 30, left: 45 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#9DA5A6', fontSize: 10, interval: 4 },
        axisLine: { lineStyle: { color: '#283138' } },
      },
      yAxis: {
        type: 'value',
        name: '°C',
        axisLabel: { color: '#9DA5A6', fontSize: 10 },
        splitLine: { lineStyle: { color: '#283138', type: 'dashed' } },
      },
      series: [
        {
          name: '最高温',
          type: 'line',
          data: highs,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#D96C3F', width: 1.5 },
        },
        {
          name: '最低温',
          type: 'line',
          data: lows,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#4FA3A5', width: 1.5 },
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [dailyData]);

  // 降水趋势图
  useEffect(() => {
    if (!precipChartRef.current || dailyData.length === 0) return;
    const chart = echarts.init(precipChartRef.current);

    const dates = dailyData.map((d) => d.fxDate.slice(5));
    const precips = dailyData.map((d) => parseFloat(d.precip) || 0);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#171D21',
        borderColor: '#283138',
        textStyle: { color: '#F2E9D8', fontSize: 12 },
      },
      grid: { top: 10, right: 20, bottom: 20, left: 45 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#9DA5A6', fontSize: 10, interval: 4 },
        axisLine: { lineStyle: { color: '#283138' } },
      },
      yAxis: {
        type: 'value',
        name: 'mm',
        axisLabel: { color: '#9DA5A6', fontSize: 10 },
        splitLine: { lineStyle: { color: '#283138', type: 'dashed' } },
      },
      series: [
        {
          name: '降水量',
          type: 'bar',
          data: precips,
          barWidth: 8,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#4FA3A5' },
              { offset: 1, color: 'rgba(79, 163, 165, 0.2)' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [dailyData]);

  // AQI 趋势图
  useEffect(() => {
    if (!aqiChartRef.current || airHourly.length === 0) return;
    const chart = echarts.init(aqiChartRef.current);

    const times = airHourly.map((item) => {
      const match = item.fxTime.match(/T(\d{2}):/);
      return match ? `${match[1]}:00` : item.fxTime;
    });
    const aqis = airHourly.map((item) => parseFloat(item.aqi) || 0);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#171D21',
        borderColor: '#283138',
        textStyle: { color: '#F2E9D8', fontSize: 12 },
      },
      grid: { top: 10, right: 20, bottom: 20, left: 45 },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: { color: '#9DA5A6', fontSize: 10, interval: 8 },
        axisLine: { lineStyle: { color: '#283138' } },
      },
      yAxis: {
        type: 'value',
        name: 'AQI',
        axisLabel: { color: '#9DA5A6', fontSize: 10 },
        splitLine: { lineStyle: { color: '#283138', type: 'dashed' } },
      },
      series: [
        {
          name: 'AQI',
          type: 'line',
          data: aqis,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#88B04B', width: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(136, 176, 75, 0.2)' },
              { offset: 1, color: 'rgba(0,0,0,0)' },
            ]),
          },
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [airHourly]);

  // 加载中
  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-page__loading">
          <div className="stats-page__loading-spinner" />
          <p>加载统计数据...</p>
        </div>
      </div>
    );
  }

  // 错误
  if (error) {
    return (
      <div className="stats-page">
        <div className="stats-page__error">
          <p>{error}</p>
          <button onClick={() => navigate('/')} type="button">返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      {/* 顶部导航 */}
      <header className="stats-page__header">
        <button className="stats-page__back" onClick={() => navigate('/')} type="button">
          ← 返回
        </button>
        <h1 className="stats-page__title">
          统计详情 · {cityName}
        </h1>
      </header>

      <main className="stats-page__content">
        {/* 30 天温度趋势 */}
        <section className="stats-page__section">
          <h3 className="stats-page__section-title">近 30 天温度趋势</h3>
          <div className="stats-page__chart" ref={tempChartRef} />
        </section>

        {/* 30 天降水趋势 */}
        <section className="stats-page__section">
          <h3 className="stats-page__section-title">近 30 天降水趋势</h3>
          <div className="stats-page__chart" ref={precipChartRef} />
        </section>

        {/* 30 天 AQI 趋势 */}
        <section className="stats-page__section">
          <h3 className="stats-page__section-title">近 30 天 AQI 趋势</h3>
          <div className="stats-page__chart" ref={aqiChartRef} />
        </section>

        {/* 周统计明细 */}
        {weeklyStats && (
          <section className="stats-page__section">
            <h3 className="stats-page__section-title">周统计明细</h3>
            <div className="stats-page__table">
              <div className="stats-page__table-row header">
                <span>指标</span>
                <span>数值</span>
              </div>
              <div className="stats-page__table-row">
                <span>统计周期</span>
                <span>{weeklyStats.weekStart} ~ {weeklyStats.weekEnd}</span>
              </div>
              <div className="stats-page__table-row">
                <span>平均气温</span>
                <span>{weeklyStats.avgTemp}°C</span>
              </div>
              <div className="stats-page__table-row">
                <span>累计降水</span>
                <span>{weeklyStats.totalPrecipitation}mm</span>
              </div>
              <div className="stats-page__table-row">
                <span>雨天数</span>
                <span>{weeklyStats.rainyDays} 天</span>
              </div>
              <div className="stats-page__table-row">
                <span>平均 AQI</span>
                <span>{weeklyStats.aqiAvg}</span>
              </div>
              <div className="stats-page__table-row">
                <span>样本完整度</span>
                <span>{weeklyStats.sampleDays}/{weeklyStats.expectedDays} 天</span>
              </div>
            </div>
          </section>
        )}

        {/* 月统计明细 */}
        {monthlyStats && (
          <section className="stats-page__section">
            <h3 className="stats-page__section-title">月统计明细</h3>
            <div className="stats-page__table">
              <div className="stats-page__table-row header">
                <span>指标</span>
                <span>数值</span>
              </div>
              <div className="stats-page__table-row">
                <span>统计月份</span>
                <span>{monthlyStats.month}</span>
              </div>
              <div className="stats-page__table-row">
                <span>平均气温</span>
                <span>{monthlyStats.avgTemp}°C</span>
              </div>
              <div className="stats-page__table-row">
                <span>累计降水</span>
                <span>{monthlyStats.totalPrecipitation}mm</span>
              </div>
              <div className="stats-page__table-row">
                <span>雨天数</span>
                <span>{monthlyStats.rainyDays} 天</span>
              </div>
              <div className="stats-page__table-row">
                <span>平均 AQI</span>
                <span>{monthlyStats.aqiAvg}</span>
              </div>
              <div className="stats-page__table-row">
                <span>样本天数</span>
                <span>{monthlyStats.sampleDays}/{monthlyStats.expectedDays} 天</span>
              </div>
              <div className="stats-page__table-row">
                <span>统计模式</span>
                <span>{monthlyStats.isPartialMonth ? '截至最新采样日' : '完整月度'}</span>
              </div>
              <div className="stats-page__table-row">
                <span>数据状态</span>
                <span>{monthlyStats.statsStatus === 'partial' ? '⚠ 不完整' : '✓ 完整'}</span>
              </div>
            </div>
          </section>
        )}

        {/* 样本期说明 */}
        <section className="stats-page__section stats-page__section--note">
          <h3 className="stats-page__section-title">样本期说明</h3>
          <p className="stats-page__note">
            当前月统计基于截至最新采样日的数据进行聚合。
            {monthlyStats?.isPartialMonth && (
              <>
                本月统计为部分月份数据（{monthlyStats.sampleDays}/{monthlyStats.expectedDays} 天），
                不代表完整自然月最终值。完整月度统计将在月底封账后生成。
              </>
            )}
          </p>
          <p className="stats-page__note">
            周统计按自然周（周一至周日）聚合，月统计按自然月聚合。
            AQI 统计基于实测快照样本均值，不混用预报数据。
          </p>
        </section>

        {/* 数据来源 */}
        <footer className="stats-page__footer">
          <p>数据来源：和风天气 API | 数据更新时间：{new Date().toLocaleString('zh-CN')}</p>
        </footer>
      </main>
    </div>
  );
}
