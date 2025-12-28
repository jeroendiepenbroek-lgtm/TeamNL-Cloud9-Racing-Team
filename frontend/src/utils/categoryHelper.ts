/**
 * Get rider category with correct priority logic
 * 
 * RULE:
 * - Use zwift_official_category as base
 * - EXCEPT: if zwift_official_category is 'A' AND zwiftracing_category is 'A+', use 'A+'
 * - This ensures A+ riders are properly detected while maintaining official category as source of truth
 */
export function getRiderCategory(
  zwift_official_category: string | null,
  zwiftracing_category: string | null
): string {
  // A+ detection: if official is A, check if zwiftracing has upgraded to A+
  if (zwift_official_category === 'A' && zwiftracing_category === 'A+') {
    return 'A+'
  }
  
  // Default: use zwift_official_category as source of truth
  return zwift_official_category || zwiftracing_category || 'D'
}
