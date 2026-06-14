/**
 * @file 应用路由配置
 * @description 定义应用的页面路由
 */

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

/** 路由懒加载 */
const Home = lazy(() => import('./pages/Home'));
const Stats = lazy(() => import('./pages/Stats'));

/**
 * 加载中占位组件
 * @description 路由懒加载时的 Loading 状态
 */
function PageLoading(): JSX.Element {
  return (
    <div className="page-loading">
      <div className="page-loading__spinner" />
      <p className="page-loading__text">加载中...</p>
    </div>
  );
}

/**
 * 应用路由组件
 * @description 定义应用的一级路由
 */
export function AppRouter(): JSX.Element {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </Suspense>
  );
}
