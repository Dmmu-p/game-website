"use client";

import { useEffect, useState } from "react";

/**
 * 根据视口宽度计算棋盘格子尺寸，保证在手机端不会横向溢出。
 * 初次渲染返回 maxSize（SSR 静态导出无 window），挂载后按真实视口收敛。
 *
 * @param cols    每行格子数
 * @param maxSize 格子最大尺寸（桌面端上限）
 * @param minSize 格子最小尺寸（极小屏下限）
 * @param reserve 需要预留的固定宽度（页面/卡片内边距 + 棋盘边框等，px）
 */
export function useFitCellSize(
  cols: number,
  maxSize: number,
  minSize: number,
  reserve = 84
): number {
  const [size, setSize] = useState(maxSize);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      // 减去预留宽度与格子间隙（默认 2px），得到可分配宽度
      const avail = window.innerWidth - reserve - Math.max(0, cols - 1) * 2;
      const fit = Math.floor(avail / cols);
      setSize(Math.max(minSize, Math.min(maxSize, fit)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [cols, maxSize, minSize, reserve]);

  return size;
}
