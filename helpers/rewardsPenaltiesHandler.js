// rewardsPenaltiesHandler.js

const { logger } = require('./logger');

// Reward and Penalty pools for different event types
const eventOutcomes = {
  rewards: {
    quest: [
      { outcome: 'Increased movement speed for 24 hours', chance: 0.5 },
      { outcome: 'A coin that can skip one event requirement', chance: 0.5 }
    ],
    challenge: [
      { outcome: 'Buff to next challenge (requirements reduced)', chance: 0.5 },
      { outcome: 'Bonus clue for next puzzle', chance: 0.5 }
    ],
    boss: [
      { outcome: 'Double rewards from next boss', chance: 0.5 },
      { outcome: 'Unlock a new special ability', chance: 0.5 }
    ],
    puzzle: [
      { outcome: 'Extra attempt at next puzzle', chance: 0.5 },
      { outcome: 'Hint for future puzzle', chance: 0.5 }
    ],
    transport: [
      { outcome: 'Free transport to a distant tile', chance: 0.5 },
      { outcome: 'Teleport to any explored tile', chance: 0.5 }
    ]
  },
  penalties: {
    general: [
      { outcome: 'Movement restriction for 24 hours', chance: 0.5 },
      { outcome: 'Teleport to a random tile', chance: 0.5 },
      { outcome: 'Extra challenge on next tile', chance: 0.5 }
    ],
    boss: [
      { outcome: 'Teleport to a random tile', chance: 0.5 },
      { outcome: 'Movement restriction for 24 hours', chance: 0.5 },
      { outcome: 'Extra challenge on next tile', chance: 0.5 }
    ],
    challenge: [
      { outcome: 'Teleport to a random tile', chance: 0.5 },
      { outcome: 'Movement restriction for 24 hours', chance: 0.5 },
      { outcome: 'Extra challenge on next tile', chance: 0.5 }
    ],
    puzzle: [
      { outcome: 'Lose one attempt at a future puzzle', chance: 0.5 },
      { outcome: 'No hint for future puzzles', chance: 0.5 }
    ]
  }
};

// Helper function to process outcomes (both rewards and penalties)
async function processOutcome(teamName, eventType, outcomeType) {
  const eventOutcomesList = eventOutcomes[outcomeType][eventType.toLowerCase()] || eventOutcomes[outcomeType].general;
  if (!eventOutcomesList) {
    logger(`Invalid event type for ${outcomeType}: ${eventType}`);
    return;
  }

  const randomIndex = Math.floor(Math.random() * eventOutcomesList.length);
  const selectedOutcome = eventOutcomesList[randomIndex];
  const roll = Math.random();

  if (roll <= selectedOutcome.chance) {
    logger(`${outcomeType === 'rewards' ? 'Reward' : 'Penalty'} for ${teamName} after ${outcomeType === 'rewards' ? 'completing' : 'forfeiting'} ${eventType}: ${selectedOutcome.outcome}`);
    // Implement logic to apply the outcome to the team
  } else {
    logger(`No ${outcomeType === 'rewards' ? 'reward' : 'penalty'} applied for ${teamName} after ${outcomeType === 'rewards' ? 'completing' : 'forfeiting'} ${eventType}`);
  }
}

// Apply rewards based on event completion
async function applyReward(teamName, eventType) {
  await processOutcome(teamName, eventType, 'rewards');
}

// Apply penalties based on event forfeiture or failure
async function applyPenalty(teamName, eventType) {
  await processOutcome(teamName, eventType, 'penalties');
}

module.exports = {
  applyReward,
  applyPenalty,
};
