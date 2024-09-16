// movementLogic.js

const databaseHelper = require('./databaseHelper');
const { logger } = require('./logger');

// Function to calculate the new tile after moving in a direction
function calculateNewTile(currentTile, direction) {
  if (!currentTile || currentTile.length < 2) {
    logger('Invalid current tile format');
    return null;
  }

  const col = currentTile.charAt(0);
  const row = parseInt(currentTile.slice(1), 10);

  if (isNaN(row)) {
    logger('Invalid row number in the tile');
    return null;
  }

  const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0);
  let newColIndex = colIndex;
  let newRow = row;

  // Determine new column and row based on direction
  switch (direction.toLowerCase()) {
    case 'north':
      newRow -= 1;
      break;
    case 'south':
      newRow += 1;
      break;
    case 'west':
      newColIndex -= 1;
      break;
    case 'east':
      newColIndex += 1;
      break;
    default:
      logger('Invalid direction');
      return null;
  }

  // Define map boundaries
  const MIN_COL_INDEX = 0;
  const MAX_COL_INDEX = 5;
  const MIN_ROW = 1;
  const MAX_ROW = 10;

  // Log the move
  logger(`Attempting to move from ${col}${row} to column index ${newColIndex}, row ${newRow}`);

  // Ensure the new position is within bounds
  if (newColIndex < MIN_COL_INDEX || newColIndex > MAX_COL_INDEX || newRow < MIN_ROW || newRow > MAX_ROW) {
    logger('New position is out of bounds');
    return null;
  }

  const newColLetter = String.fromCharCode('A'.charCodeAt(0) + newColIndex);
  logger(`Final position: ${newColLetter}${newRow}`);
  return `${newColLetter}${newRow}`;
}

// Penalty: restrict movement for a duration (e.g., 24 hours)
async function movementPenalty(teamName) {
  await databaseHelper.updateTeamStatus(teamName, 'Movement restricted');
  logger(`Movement restricted for team ${teamName}.`);
}

// Penalty: add an extra challenge to the next tile
async function extraChallengePenalty(teamName) {
  await databaseHelper.updateTeamStatus(teamName, 'Extra challenge');
  logger(`An extra challenge has been added for team ${teamName}.`);
}

// Penalty: teleport the team to a random tile
async function teleportPenalty(teamName) {
  const randomTile = getRandomTile();
  await databaseHelper.updateTeamLocation(teamName, randomTile);
  logger(`Team ${teamName} has been teleported to ${randomTile}.`);
}

// Function to get a random valid tile
function getRandomTile() {
  const colIndex = Math.floor(Math.random() * 6); // A-F (6 options)
  const rowIndex = Math.floor(Math.random() * 10) + 1; // 1-10
  const col = String.fromCharCode('A'.charCodeAt(0) + colIndex);
  return `${col}${rowIndex}`;
}

module.exports = {
  calculateNewTile,
  movementPenalty,
  extraChallengePenalty,
  teleportPenalty,
};
