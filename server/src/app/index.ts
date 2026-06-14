/**
 * @file Express 应用入口
 * @description 创建和配置 Express 服务器
 */

import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initDatabase } from '../db';
import { logger, setLogLevel } from '../utils/logger';
import routes from '../routes';

// 设置日志级别
setLogLevel(config.logLevel as 'debug' | 'info' | 'warn' | 'error');

// 初始化数据库
initDatabase();

const app = express();

// ==================== 中间件 ====================

/** CORS 跨域配置 */
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

/** JSON 请求体解析 */
app.use(express.json());

/** URL 编码请求体解析 */
app.use(express.urlencoded({ extended: true }));

// ==================== 路由 ====================

app.use(routes);

// ==================== 全局错误处理 ====================

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error('未捕获的服务器错误', { message: err.message, stack: err.stack });
    res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: '服务器内部错误',
      data: null,
    });
  }
);

// ==================== 启动服务 ====================

app.listen(config.port, () => {
  logger.info(`服务已启动`, { port: config.port });
  logger.info(`API 地址: http://localhost:${config.port}`);

  if (!config.qweatherApiKey || config.qweatherApiKey === 'your_qweather_api_key_here') {
    logger.warn('⚠ 未配置和风天气 API Key，请在 server/.env 中设置 QWEATHER_API_KEY');
  }

  if (!config.qweatherApiHost) {
    logger.warn('⚠ 未配置和风天气 API Host，请在 server/.env 中设置 QWEATHER_API_HOST');
  }
});
