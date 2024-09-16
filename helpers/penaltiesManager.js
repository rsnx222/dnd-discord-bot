// penaltiesManager.js

const { movementPenalty, extraChallengePenalty, teleportPenalty } = require('./movementLogic');
const { logger } = require('./logger');

// Map the penalty options to their corresponding functions
const penaltyActions = {
  movementPenalty,
  extraChallengePenalty,
  teleportPenalty,
};

// Apply a random penalty to the team
async function applyRandomPenalty(teamName) {
  const penaltyKeys = Object.keys(penaltyActions);
  const randomPenalty = penaltyKeys[Math.floor(Math.random() * penaltyKeys.length)];
  
  try {
    await penaltyActions[randomPenalty](teamName);
    logger(`Applied ${randomPenalty} to team ${teamName}.`);
  } catch (error) {
    logger(`Error applying penalty: ${randomPenalty} to team ${teamName}.`, error);
  }
}

module.exports = {
  applyRandomPenalty,
};
