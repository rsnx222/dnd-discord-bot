// penaltiesManager.js

const { movementPenalty, extraChallengePenalty, teleportPenalty } = require('../core/movementLogic');

const penaltyOptions = [
  'movementPenalty',
  'extraChallengePenalty',
  'teleportPenalty',
];

// Apply a random penalty to the team
async function applyRandomPenalty(teamName) {
  const penalty = penaltyOptions[Math.floor(Math.random() * penaltyOptions.length)];

  switch (penalty) {
    case 'movementPenalty':
      await movementPenalty(teamName);
      break;
    case 'extraChallengePenalty':
      await extraChallengePenalty(teamName);
      break;
    case 'teleportPenalty':
      await teleportPenalty(teamName);
      break;
    default:
      console.log('No valid penalty applied.');
  }
}

module.exports = {
  applyRandomPenalty,
};
