/**
 * @file 响应工具
 * @description 统一构造 API 成功/失败响应
 */

import type { ApiSuccess, ApiError, ApiResponse, ErrorCode } from '../types';

/**
 * 构造成功响应
 * @param data 响应数据
 * @param message 提示信息
 * @returns 成功响应对象
 */
export function success<T>(data: T, message = '操作成功'): ApiSuccess<T> {
  return {
    success: true,
    code: 200,
    message,
    data,
  };
}

/**
 * 构造失败响应
 * @param code 错误码
 * @param message 错误信息
 * @returns 失败响应对象
 */
export function error(code: ErrorCode | string, message: string): ApiError {
  return {
    success: false,
    code,
    message,
    data: null,
  };
}

/**
 * 通用 try-catch 包装器
 * @param fn 业务函数
 * @param errorCode 默认错误码
 * @returns API 响应
 */
export async function wrapApi<T>(
  fn: () => Promise<T>,
  errorCode: ErrorCode | string = 'INTERNAL_SERVER_ERROR'
): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : '服务器内部错误';
    return error(errorCode, message);
  }
}
