// eventManager.js

const { rollForReward } = require('./rewardsManager');
const { applyRandomPenalty } = require('./penaltiesManager');

function generateEventMessage(tileData, eventIndex = 0) {
  if (!tileData || !tileData.event_type) {
    return 'You have arrived at a new tile, but there is no information available about it.';
  }

  const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];
  const currentEventType = eventTypes[eventIndex] || eventTypes[0];
  let message = '';

  switch (currentEventType.toLowerCase()) {
    case 'quest':
      message = `You have discovered a quest on this tile. ${tileData.description}`;
      break;
    case 'challenge':
      message = `Prepare yourself! This tile contains a challenge: ${tileData.description}`;
      break;
    case 'boss':
      message = `A fearsome boss awaits on this tile. ${tileData.description}`;
      break;
    case 'dungeon':
      message = `You have entered a dungeon. Beware of what lies ahead: ${tileData.description}`;
      break;
    case 'transport link':
      message = `This tile has a transport link. ${tileData.description}`;
      break;
    default:
      message = `You have encountered something on this tile: ${tileData.description}`;
  }

  return message;
}

// Function to handle completing an event
async function handleEventCompletion(tileData, eventIndex, team) {
  const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];
  const currentEventType = eventTypes[eventIndex] || eventTypes[0];

  const reward = rollForReward(currentEventType);
  let message = '';

  if (reward) {
    message += `Congratulations! Your team earned a reward: ${reward}\n`;
  } else {
    message += 'No reward was earned this time.\n';
  }

  return message;
}

// Function to handle event failure/forfeit
async function handleEventFailure(tileData, eventIndex, team) {
  let message = 'The event was forfeited or failed. A penalty will be applied.\n';
  const penalty = await applyRandomPenalty(team.teamName);

  if (penalty) {
    message += `Penalty applied: ${penalty}\n`;
  } else {
    message += 'No penalty applied this time.';
  }

  return message;
}

// Function to complete or forfeit events based on the event type
async function handleEventAction(action, tileData, eventIndex, team, answer = null) {
  const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];
  const currentEventType = eventTypes[eventIndex] || eventTypes[0];

  switch (currentEventType.toLowerCase()) {
    case 'boss':
      return action === 'complete' ? await handleBossCompletion(team) : await handleEventFailure(tileData, eventIndex, team);
    case 'challenge':
      return action === 'complete' ? await handleChallengeCompletion(team) : await handleEventFailure(tileData, eventIndex, team);
    case 'puzzle':
      return action === 'complete' ? await handlePuzzleCompletion(team, answer) : await handleEventFailure(tileData, eventIndex, team);
    case 'quest':
      return action === 'complete' ? await handleQuestCompletion(team) : await handleEventFailure(tileData, eventIndex, team);
    case 'transport link':
      return await handleTransportUsage(team, tileData);
    default:
      return 'Invalid event type.';
  }
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
  handleEventAction,
};
