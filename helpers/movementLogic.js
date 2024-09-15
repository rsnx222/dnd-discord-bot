// movementLogic.js

const databaseHelper = require('./databaseHelper');

// Function to calculate the new tile after moving in a direction
function calculateNewTile(currentTile, direction) {
  if (!currentTile || currentTile.length < 2) {
    console.error('Invalid current tile format');
    return null;
  }

  const col = currentTile.charAt(0);
  const row = parseInt(currentTile.slice(1));

  if (isNaN(row)) {
    console.error('Invalid row number in the tile');
    return null;
  }

  const colIndex = col.charCodeAt(0) - 'A'.charCodeAt(0);
  let newColIndex = colIndex;
  let newRow = row;

  switch (direction.toLowerCase()) {
    case 'north': newRow -= 1; break;
    case 'south': newRow += 1; break;
    case 'west': newColIndex -= 1; break;
    case 'east': newColIndex += 1; break;
    default: 
      console.error('Invalid direction');
      return null;
  }

  console.log(`Moving from col ${col}, row ${row} to col ${String.fromCharCode('A'.charCodeAt(0) + newColIndex)}, row ${newRow}`);

  const MIN_COL_INDEX = 0;
  const MAX_COL_INDEX = 5;
  const MIN_ROW = 1;
  const MAX_ROW = 10;

  if (newColIndex < MIN_COL_INDEX || newColIndex > MAX_COL_INDEX || newRow < MIN_ROW || newRow > MAX_ROW) {
    console.error('New position is out of bounds');
    return null;
  }

  const newColLetter = String.fromCharCode('A'.charCodeAt(0) + newColIndex);
  console.log(`Final position: ${newColLetter}${newRow}`);
  return `${newColLetter}${newRow}`;
}

// Penalty: restrict movement for a duration (e.g., 24 hours)
async function movementPenalty(teamName) {
  await databaseHelper.updateTeamStatus(teamName, 'Movement restricted');
  console.log(`Movement restricted for team ${teamName}.`);
}

// Penalty: add an extra challenge to the next tile
async function extraChallengePenalty(teamName) {
  await databaseHelper.updateTeamStatus(teamName, 'Extra challenge');
  console.log(`An extra challenge has been added for team ${teamName}.`);
}

// Penalty: teleport the team to a random tile
async function teleportPenalty(teamName) {
  const randomTile = getRandomTile();
  await databaseHelper.updateTeamLocation(teamName, randomTile);
  console.log(`Team ${teamName} has been teleported to ${randomTile}.`);
}

// Function to get a random valid tile
function getRandomTile() {
  const colIndex = Math.floor(Math.random() * 6);
  const rowIndex = Math.floor(Math.random() * 10) + 1;
  const col = String.fromCharCode('A'.charCodeAt(0) + colIndex);
  return `${col}${rowIndex}`;
}

module.exports = {
  calculateNewTile,
  movementPenalty,
  extraChallengePenalty,
  teleportPenalty,
};
