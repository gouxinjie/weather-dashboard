/**
 * @component BrandMark
 * @description 品牌徽记图标组件，提供首页与统计页统一使用的站点标识
 * @author
 * @created 2026-06-19
 * @updated 2026-06-19
 */

import { useId } from 'react';

/** BrandMark 组件属性 */
interface BrandMarkProps {
  /** 类型：string；含义：外层容器类名；是否必填：否；默认值：无 */
  className?: string;
}

/**
 * 品牌徽记图标
 * @param props 组件属性，必填，默认值：无
 * @returns 品牌徽记节点
 */
export function BrandMark({ className }: BrandMarkProps): JSX.Element {
  const gradientId = useId();
  const ringId = useId();
  const glowId = useId();

  return (
    <span aria-hidden="true" className={className}>
      <svg viewBox="0 0 40 40" focusable="false">
        <defs>
          <radialGradient cx="34%" cy="28%" id={gradientId} r="82%">
            <stop offset="0%" stopColor="#9ae1ff" />
            <stop offset="42%" stopColor="#4c9cd4" />
            <stop offset="100%" stopColor="#173652" />
          </radialGradient>
          <linearGradient id={ringId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(233, 245, 250, 0.95)" />
            <stop offset="100%" stopColor="rgba(109, 178, 220, 0.18)" />
          </linearGradient>
          <radialGradient cx="50%" cy="50%" id={glowId} r="50%">
            <stop offset="0%" stopColor="rgba(183, 228, 248, 0.56)" />
            <stop offset="100%" stopColor="rgba(183, 228, 248, 0)" />
          </radialGradient>
        </defs>

        <circle cx="20" cy="20" fill={["url(#", gradientId, ")"].join('')} r="18" />
        <circle
          cx="20"
          cy="20"
          fill="none"
          r="18"
          stroke={["url(#", ringId, ")"].join('')}
          strokeWidth="1.2"
        />
        <circle cx="20" cy="20" fill={["url(#", glowId, ")"].join('')} r="16.2" />
        <circle
          cx="20"
          cy="20"
          fill="rgba(9, 24, 37, 0.18)"
          r="13.6"
          stroke="rgba(224, 241, 248, 0.24)"
          strokeWidth="0.8"
        />

        <path
          d="M20 7.9v24.2M7.9 20h24.2M11.5 11.5l17 17M28.5 11.5l-17 17"
          stroke="rgba(226, 241, 248, 0.16)"
          strokeLinecap="round"
          strokeWidth="0.85"
        />
        <circle
          cx="20"
          cy="20"
          fill="none"
          r="9.7"
          stroke="rgba(219, 239, 248, 0.18)"
          strokeDasharray="1.4 2.2"
          strokeWidth="0.95"
        />

        <path
          d="M20 11.4 24.7 15.5 23.5 21.6 20 26.7 16.5 21.6 15.3 15.5Z"
          fill="rgba(11, 27, 40, 0.3)"
          stroke="rgba(238, 247, 251, 0.84)"
          strokeLinejoin="round"
          strokeWidth="1"
        />
        <path
          d="M20 13.5 23 16.1 22.2 20.1 20 23.3 17.8 20.1 17 16.1Z"
          fill="rgba(235, 245, 250, 0.12)"
          stroke="rgba(220, 240, 249, 0.55)"
          strokeLinejoin="round"
          strokeWidth="0.9"
        />
        <circle cx="20" cy="18.9" fill="rgba(239, 247, 251, 0.92)" r="1.85" />
        <path
          d="M20 9.7 21.5 13 25.1 13.3 22.3 15.7 23.1 19.2 20 17.4 16.9 19.2 17.7 15.7 14.9 13.3 18.5 13Z"
          fill="none"
          stroke="rgba(245, 249, 251, 0.46)"
          strokeLinejoin="round"
          strokeWidth="0.85"
        />
      </svg>
    </span>
  );
}
