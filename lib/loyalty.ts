/** Pure loyalty punch-card progress (unit-tested). */

export const LOYALTY_THRESHOLD = 10;

export type LoyaltyProgress = {
  completed: number;
  threshold: number;
  /** Cuts within the current card (0..threshold). */
  inCard: number;
  /** Cuts left until the next reward. */
  remaining: number;
  /** True the moment a reward has been earned (a full card completed). */
  rewardReady: boolean;
};

export function loyaltyProgress(completed: number, threshold = LOYALTY_THRESHOLD): LoyaltyProgress {
  const safeCompleted = Math.max(0, completed);
  const inCard = safeCompleted % threshold;
  const rewardReady = safeCompleted > 0 && inCard === 0;
  return {
    completed: safeCompleted,
    threshold,
    inCard: rewardReady ? threshold : inCard,
    remaining: rewardReady ? 0 : threshold - inCard,
    rewardReady,
  };
}
