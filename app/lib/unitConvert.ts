// lib/unitConvert.ts

/**
 * 毫米 → 像素
 * @param mm 毫米
 * @param dpi 分辨率
 * @returns 像素值
 */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round(mm / 25.4 * dpi)
}

/**
 * 像素 → 毫米
 * @param px 像素
 * @param dpi 分辨率
 * @returns 毫米值
 */
export function pxToMm(px: number, dpi: number): number {
  return Math.round((px * 25.4) / dpi * 100) / 100
}