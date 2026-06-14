/**
 * @file 应用入口
 * @description React 应用主入口，挂载根组件
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './App';
import './styles/global.scss';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('根元素 #root 未找到');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </React.StrictMode>
);
