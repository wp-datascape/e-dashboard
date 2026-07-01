/**
 * Konvensi label Indonesia:
 *   jt  = juta  (1.000.000)
 *   M   = miliar (1.000.000.000)
 */
export function formatIDR(val: number): string {
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`
  if (val >= 1_000_000)     return `Rp ${(val / 1_000_000).toFixed(1)}jt`
  return `Rp ${val.toLocaleString('id-ID')}`
}

/** Format value enum snake_case dari DB jadi label tampilan, mis. 'e_commerce' -> 'E Commerce'. */
export function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
