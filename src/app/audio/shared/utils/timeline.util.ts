export function secondsToPx(sec: number, pxPerSecond: number): number {
  return Math.round(sec * pxPerSecond);
}

export function pxToSeconds(px: number, pxPerSecond: number): number {
  return px / pxPerSecond;
}
