// rewardLogic.js

const databaseHelper = require('./databaseHelper');
const { logger } = require('./logger');

// Simulate a dice roll (1-6)
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// Specific reward handlers
const rewardHandlers = {
  skipTileReward: async (teamName) => {
    logger(`Team ${teamName} received a tile skip reward!`);
    // Implement logic to allow skipping a tile
  },
  reducedDropRequirement: async (teamName) => {
    logger(`Team ${teamName} received reduced drop requirements!`);
    // Logic to reduce the drop requirement
  },
  skipRequirementReward: async (teamName) => {
    logger(`Team ${teamName} received a skip requirement reward!`);
    // Logic to allow skipping a requirement
  },
  bonusTileUnlock: async (teamName) => {
    logger(`Team ${teamName} received a bonus tile unlock!`);
    // Logic to unlock an extra tile
  },
  skipQuestReward: async (teamName) => {
    logger(`Team ${teamName} received a skip quest reward!`);
    // Logic to allow skipping a quest
  },
  unlockSpecialPath: async (teamName) => {
    logger(`Team ${teamName} unlocked a special path!`);
    // Logic to unlock a special path
  },
  reducedRequirement: async (teamName) => {
    logger(`Team ${teamName} received reduced challenge requirements!`);
    // Logic to reduce challenge requirements
  },
  reducedChallengeDifficulty: async (teamName) => {
    logger(`Team ${teamName} received reduced challenge difficulty!`);
    // Logic to reduce challenge difficulty
  },
  extraAttempts: async (teamName) => {
    logger(`Team ${teamName} received extra attempts on a puzzle!`);
    // Logic to grant extra attempts
  },
  hintsReward: async (teamName) => {
    logger(`Team ${teamName} received hints for the puzzle!`);
    // Logic to grant hints for the puzzle
  },
};

// Apply the reward to the team
async function applyReward(teamName, rewardType) {
  if (rewardHandlers[rewardType]) {
    await rewardHandlers[rewardType](teamName);
  } else {
    logger('No valid reward applied.');
  }
}

module.exports = {
  rollDice,
  applyReward,
};
