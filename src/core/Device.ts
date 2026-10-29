/** 设备检测（DES-03 / REQ-008）：判定 H5（触控优先）或 Web（键鼠优先，不互斥）。 */
export interface DeviceTraits {
  hasTouch: boolean;
  isMobileUA: boolean;
  /** iPadOS 13+ 桌面式 UA（Macintosh + 多点触控），需按触屏设备处理。 */
  isIPadOs?: boolean;
}

export function detectDevice(traits: DeviceTraits): 'web' | 'h5' {
  const touchCapable = traits.hasTouch || traits.isMobileUA;
  return touchCapable && (traits.isMobileUA || !!traits.isIPadOs) ? 'h5' : 'web';
}

export function getRuntimeDeviceTraits(): DeviceTraits {
  const w = window as Window & { ontouchstart?: unknown };
  return {
    hasTouch: 'ontouchstart' in w || navigator.maxTouchPoints > 0,
    isMobileUA: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
    isIPadOs: /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1
  };
}
