// rewardsPenaltiesHandler.js

const { logger } = require('./logger');

// Reward and Penalty pools for different event types
const eventOutcomes = {
  rewards: {
    quest: [
      { outcome: 'Increased movement speed for 24 hours' },
      { outcome: 'A coin that can skip one event requirement' }
    ],
    challenge: [
      { outcome: 'Buff to next challenge (requirements reduced)' },
      { outcome: 'Bonus clue for next puzzle' }
    ],
    boss: [
      { outcome: 'Double rewards from next boss' },
      { outcome: 'Unlock a new special ability' }
    ],
    puzzle: [
      { outcome: 'Extra attempt at next puzzle' },
      { outcome: 'Hint for future puzzle' }
    ],
    transport: [
      { outcome: 'Free transport to a distant tile' },
      { outcome: 'Teleport to any explored tile' }
    ]
  },
  penalties: {
    general: [
      { outcome: 'Movement restriction for 24 hours' },
      { outcome: 'Teleport to a random tile' },
      { outcome: 'Extra challenge on next tile' }
    ],
    boss: [
      { outcome: 'Teleport to a random tile' },
      { outcome: 'Movement restriction for 24 hours' },
      { outcome: 'Extra challenge on next tile' }
    ],
    challenge: [
      { outcome: 'Teleport to a random tile' },
      { outcome: 'Movement restriction for 24 hours' },
      { outcome: 'Extra challenge on next tile' }
    ],
    puzzle: [
      { outcome: 'Lose one attempt at a future puzzle' },
      { outcome: 'No hint for future puzzles' }
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

  // For rewards, apply 20% chance before selecting an outcome
  if (outcomeType === 'rewards') {
    const rewardRoll = Math.random();
    if (rewardRoll > 0.2) {
      logger(`No reward applied for ${teamName} after completing ${eventType}`);
      return;
    }
  }

  const randomIndex = Math.floor(Math.random() * eventOutcomesList.length);
  const selectedOutcome = eventOutcomesList[randomIndex];

  logger(`${outcomeType === 'rewards' ? 'Reward' : 'Penalty'} for ${teamName} after ${outcomeType === 'rewards' ? 'completing' : 'forfeiting'} ${eventType}: ${selectedOutcome.outcome}`);
  // Apply the outcome logic to the team (e.g., update the database, apply effects, etc.)
}

// Apply rewards based on event completion
async function applyReward(teamName, eventType) {
  logger(`Applying reward for ${teamName} after completing ${eventType}`);
  await processOutcome(teamName, eventType, 'rewards');
}

// Apply penalties based on event forfeiture or failure
async function applyPenalty(teamName, eventType) {
  logger(`Applying penalty for ${teamName} after forfeiting ${eventType}`);
  await processOutcome(teamName, eventType, 'penalties');
}

module.exports = {
  applyReward,
  applyPenalty,
};
