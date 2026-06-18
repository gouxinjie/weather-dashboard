/**
 * @file Express 应用入口
 * @description 创建和配置 Express 服务器
 */

import express from 'express';
import type { Server } from 'node:http';
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

/**
 * @function handleServerStartupError
 * @description 处理服务启动阶段的端口占用与系统错误，避免未捕获异常导致进程直接崩溃
 * @param error 类型：NodeJS.ErrnoException；含义：Node 服务启动时抛出的系统错误；是否必填：是；默认值：无
 * @returns 类型：void；含义：无返回值
 * @throws 无
 */
function handleServerStartupError(error: NodeJS.ErrnoException): void {
  if (error.code === 'EADDRINUSE') {
    logger.error(`服务启动失败，端口 ${config.port} 已被占用`, {
      port: config.port,
      code: error.code,
    });
    logger.error('请先停止已运行的后端进程，或在 server/.env 中修改 PORT 后重试');
    process.exit(1);
    return;
  }

  logger.error('服务启动失败', {
    message: error.message,
    code: error.code,
    stack: error.stack,
  });
  process.exit(1);
}

const server: Server = app.listen(config.port);

server.once('error', handleServerStartupError);

server.once('listening', () => {
  logger.info(`服务已启动`, { port: config.port });
  logger.info(`API 地址: http://localhost:${config.port}`);

  if (!config.qweatherApiKey || config.qweatherApiKey === 'your_qweather_api_key_here') {
    logger.warn('⚠ 未配置和风天气 API Key，请在 server/.env 中设置 QWEATHER_API_KEY');
  }

  if (!config.qweatherApiHost) {
    logger.warn('⚠ 未配置和风天气 API Host，请在 server/.env 中设置 QWEATHER_API_HOST');
  }
});
