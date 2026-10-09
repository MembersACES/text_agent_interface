/** $/GJ the annual comparison should use.
 *
 * A price-change bill stores only the latest period's blocks, which is the rate
 * they pay from now on. The checked figure subtracts the whole-bill discount
 * from that slice and comes out too low, so Alinta can look dearer than it is.
 */
export function smeGasComparisonEnergyRate(
  priceChange: boolean,
  blockRate: number,
  checkedRate?: number,
): number | undefined {
  if (priceChange && blockRate > 0) return blockRate;
  if (checkedRate != null && checkedRate > 0) return checkedRate;
  return blockRate > 0 ? blockRate : undefined;
}
