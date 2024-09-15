// rewardsManager.js

// Reward pool for different event types
const rewards = {
  quest: [
    { reward: 'Increased movement speed for 24 hours', chance: 0.5 },
    { reward: 'A coin that can skip one event requirement', chance: 0.5 }
  ],
  challenge: [
    { reward: 'Buff to next challenge (requirements reduced)', chance: 0.5 },
    { reward: 'Bonus clue for next puzzle', chance: 0.5 }
  ],
  boss: [
    { reward: 'Double rewards from next boss', chance: 0.5 },
    { reward: 'Unlock a new special ability', chance: 0.5 }
  ],
  puzzle: [
    { reward: 'Extra attempt at next puzzle', chance: 0.5 },
    { reward: 'Hint for future puzzle', chance: 0.5 }
  ],
  transport: [
    { reward: 'Free transport to a distant tile', chance: 0.5 },
    { reward: 'Teleport to any explored tile', chance: 0.5 }
  ],
};

function rollForReward(eventType) {
  const eventRewards = rewards[eventType.toLowerCase()];
  if (!eventRewards) return null;

  const randomIndex = Math.floor(Math.random() * eventRewards.length);
  const selectedReward = eventRewards[randomIndex];
  const roll = Math.random();

  return roll <= selectedReward.chance ? selectedReward.reward : null;
}

module.exports = {
  rollForReward,
};
