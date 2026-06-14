/**
 * @component LifeIndices
 * @description 生活指数模块 - 展示穿衣、洗车、运动、感冒、紫外线等指数
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import type { IndexItem } from '../../../types';
import './index.scss';

/** Props 定义 */
interface LifeIndicesProps {
  /** 生活指数数据列表 */
  data: IndexItem[];
}

/** 生活指数图标映射 */
const INDEX_ICONS: Record<string, string> = {
  '1': '👔',   // 穿衣
  '2': '🚗',   // 洗车
  '3': '🧥',   // 感冒
  '4': '🔆',   // 紫外线
  '5': '🏃',   // 运动
  '6': '🌊',   // 钓鱼
  '7': '🚲',   // 交通
  '8': '🌿',   // 过敏
  '9': '🏄',   // 旅游
  '10': '💧',  // 晾晒
  '11': '🌬️', // 风力
  '12': '😷',  // 空气污染扩散
  '13': '🛹',  // 舒适度
  '14': '🌡️', // 中暑
};

/**
 * 生活指数模块组件
 * @description 以卡片网格形式展示各项生活指数
 */
export function LifeIndices({ data }: LifeIndicesProps): JSX.Element {
  // 选取关键指数
  const keyTypes = ['1', '2', '5', '3', '4', '13'];
  const filtered = data.filter((item) => keyTypes.includes(item.type));

  return (
    <div className="life-indices">
      <h3 className="life-indices__title">生活指数</h3>
      {filtered.length === 0 ? (
        <div className="life-indices__empty">暂无生活指数数据</div>
      ) : (
        <div className="life-indices__grid">
          {filtered.map((item) => (
            <div className="life-indices__item" key={item.type}>
              <div className="life-indices__item-header">
                <span className="life-indices__item-icon">
                  {INDEX_ICONS[item.type] || '📋'}
                </span>
                <span className="life-indices__item-name">{item.name}</span>
              </div>
              <span className="life-indices__item-level">{item.category}</span>
              <span className="life-indices__item-text">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
