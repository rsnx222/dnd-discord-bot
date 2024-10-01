// rewardsPenaltiesHandler.js

const { logger } = require('./logger');
const { addTeamRewardPenalty, getTeamChannelId } = require('./databaseHelper');

// Updated Reward and Penalty pools with new item effects
const eventOutcomes = {
  rewards: {
    general: [
      { itemName: 'Swift Boots', description: 'Auto-completes the next task you are given.' },
      { itemName: 'Skip Coin', description: 'Can complete a task of your choice.' },
      { itemName: 'Clue Map', description: 'Reveals a hidden tile of your choice on the map.' },
    ],
  },
  penalties: {
    general: [
      { itemName: 'Heavy Burden', description: 'Movement restriction for 24 hours.' },
      { itemName: 'Extra Challenge', description: 'An extra challenge on the next tile.' },
    ],
  },
};

// Helper function to process outcomes (both rewards and penalties)
async function processOutcome(teamName, eventType, outcomeType, client, interaction) {
  const eventOutcomesList = eventOutcomes[outcomeType][eventType.toLowerCase()] || eventOutcomes[outcomeType].general;

  if (!eventOutcomesList) {
    logger(`Invalid event type for ${outcomeType}: ${eventType}`);
    return;
  }

  // For rewards, apply 1 in 3 chance before selecting an outcome
  if (outcomeType === 'rewards') {
    const rewardRoll = Math.floor(Math.random() * 3); // 0, 1, or 2
    if (rewardRoll !== 0) {
      logger(`No reward applied for ${teamName} after completing ${eventType}`);
      return;
    }
  }

  const randomIndex = Math.floor(Math.random() * eventOutcomesList.length);
  const selectedOutcome = eventOutcomesList[randomIndex];

  logger(`${outcomeType === 'rewards' ? 'Reward' : 'Penalty'} for ${teamName}: ${selectedOutcome.itemName}`);

  // Add the reward or penalty to the team's records
  await addTeamRewardPenalty(teamName, outcomeType.slice(0, -1), selectedOutcome.itemName, selectedOutcome.description);

  // Notify the team
  const channelId = await getTeamChannelId(teamName);
  if (channelId && client) {
    const channel = await client.channels.fetch(channelId);
    if (channel) {
      const message = `Your team received a ${outcomeType === 'rewards' ? 'reward' : 'penalty'}: **${selectedOutcome.itemName}** - ${selectedOutcome.description}`;
      await channel.send(message);
    }
  }
}

async function applyReward(teamName, eventType, client, interaction) {
  logger(`Applying reward for ${teamName} after completing ${eventType}`);
  await processOutcome(teamName, eventType, 'rewards', client, interaction);
}

async function applyPenalty(teamName, eventType, client, interaction) {
  logger(`Applying penalty for ${teamName} after forfeiting ${eventType}`);
  await processOutcome(teamName, eventType, 'penalties', client, interaction);
}

module.exports = {
  applyReward,
  applyPenalty,
};
