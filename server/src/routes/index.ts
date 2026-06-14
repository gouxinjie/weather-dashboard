/**
 * @file 路由汇总
 * @description 统一注册所有 API 路由
 */

import { Router } from 'express';
import { citySearch, resolveCurrentCity } from '../controllers/cityController';
import {
  homeScreen,
  overview,
  hourly,
  minutely,
  daily,
  airNow,
  airHourly,
  alerts,
  indices,
  weeklyStats,
  monthlyStats,
  statsDetail,
} from '../controllers/screenController';

const router = Router();

// ==================== 城市相关 ====================

/** 城市搜索 */
router.get('/api/cities/search', citySearch);

/** 当前城市定位解析 */
router.post('/api/location/resolve-current', resolveCurrentCity);

// ==================== 天气大屏 ====================

/** 首页聚合（推荐首页使用此接口） */
router.get('/api/screen/home', homeScreen);

/** 首页概览 */
router.get('/api/screen/overview', overview);

/** 24 小时天气趋势 */
router.get('/api/screen/hourly', hourly);

/** 分钟级降水 */
router.get('/api/screen/minutely', minutely);

/** 每日预报 */
router.get('/api/screen/daily', daily);

/** 实时空气质量 */
router.get('/api/screen/air/now', airNow);

/** 空气质量小时趋势 */
router.get('/api/screen/air/hourly', airHourly);

/** 预警信息 */
router.get('/api/screen/alerts', alerts);

/** 生活指数 */
router.get('/api/screen/indices', indices);

/** 周统计 */
router.get('/api/screen/stats/weekly', weeklyStats);

/** 月统计 */
router.get('/api/screen/stats/monthly', monthlyStats);

/** 统计详情 */
router.get('/api/screen/stats/detail', statsDetail);

export default router;
