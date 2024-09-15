// eventManager.js

const { rollForReward } = require('../helpers/rewardsManager');
const { applyRandomPenalty } = require('../helpers/penaltiesManager');

function generateEventMessage(tileData) {
  if (!tileData || !tileData.event_type) {
    return 'You have arrived at a new tile, but there is no information available about it.';
  }

  const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];
  const messages = eventTypes.map(eventType => {
    switch (eventType.toLowerCase()) {
      case 'quest':
        return `You have discovered a quest on this tile. ${tileData.description}`;
      case 'challenge':
        return `Prepare yourself! This tile contains a challenge: ${tileData.description}`;
      case 'boss':
        return `A fearsome boss awaits on this tile. ${tileData.description}`;
      case 'dungeon':
        return `You have entered a dungeon. Beware of what lies ahead: ${tileData.description}`;
      case 'transport link':
        return `This tile has a transport link. ${tileData.description}`;
      default:
        return `You have encountered something on this tile: ${tileData.description}`;
    }
  });

  return messages.join('\n'); // Combine multiple event messages into one string
}


// Function to handle completing an event
async function handleEventCompletion(tileData, team) {
  const reward = rollForReward(tileData.event_type);
  let message = '';

  if (reward) {
    message += `Congratulations! Your team earned a reward: ${reward}\n`;
    // Apply the reward logic if necessary (could be tied to specific mechanics)
  } else {
    message += 'No reward was earned this time.\n';
  }

  return message;
}

// Function to handle event failure/forfeit
async function handleEventFailure(tileData, team) {
  let message = 'The event was forfeited or failed. A penalty will be applied.\n';
  const penalty = await applyRandomPenalty(team.teamName);

  if (penalty) {
    message += `Penalty applied: ${penalty}\n`;
  } else {
    message += 'No penalty applied this time.';
  }

  return message;
}

// Handle boss completion
async function handleBossCompletion(team) {
  return `The boss has been defeated! Well done, ${team.teamName}.`;
}

// Handle challenge completion
async function handleChallengeCompletion(team) {
  return `You have successfully completed the challenge! Well done, ${team.teamName}.`;
}

// Handle puzzle completion
async function handlePuzzleCompletion(team, answer) {
  // Check if the answer is correct (you would likely store correct answers somewhere)
  const correctAnswer = 'riddle answer'; // Example correct answer
  if (answer.toLowerCase() === correctAnswer.toLowerCase()) {
    return `Correct! You have successfully completed the puzzle, ${team.teamName}.`;
  } else {
    return `Incorrect! Please try again, ${team.teamName}.`;
  }
}

// Handle quest completion
async function handleQuestCompletion(team) {
  return `You have completed the quest! Congratulations, ${team.teamName}.`;
}

// Handle transport link usage
async function handleTransportUsage(team, tileData) {
  return `You used the transport link and have been moved to a new tile, ${team.teamName}. The journey continues...`;
}

module.exports = {
  generateEventMessage,
  handleEventCompletion,
  handleEventFailure,
  handleBossCompletion,
  handleChallengeCompletion,
  handlePuzzleCompletion,
  handleQuestCompletion,
  handleTransportUsage,
};
