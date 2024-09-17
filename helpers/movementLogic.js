// movementLogic.js

const databaseHelper = require('./databaseHelper');
const { sendMapAndEvent } = require('./sendMapAndEvent');
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

  // Ensure the new position is within bounds
  if (newColIndex < MIN_COL_INDEX || newColIndex > MAX_COL_INDEX || newRow < MIN_ROW || newRow > MAX_ROW) {
    logger('New position is out of bounds');
    return null;
  }

  const newColLetter = String.fromCharCode('A'.charCodeAt(0) + newColIndex);
  logger(`Final position: ${newColLetter}${newRow}`);
  return `${newColLetter}${newRow}`;
}

// Handle movement when a directional button is clicked
async function handleDirectionMove(interaction, teamName, direction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    // Fetch team data and check current location
    const teamData = await databaseHelper.getTeamData();
    const team = teamData.find(t => t.teamName === teamName);

    if (!team || !team.currentLocation) {
      logger(`Could not find current location for team ${teamName}`);
      return interaction.editReply({ content: 'Failed to move the team. Please try again later.' });
    }

    const currentLocation = team.currentLocation;
    const newTile = calculateNewTile(currentLocation, direction);

    if (!newTile) {
      return interaction.editReply({ content: 'Invalid move. The team cannot move in that direction.' });
    }

    // Update team's location and explored tiles
    await databaseHelper.updateTeamLocation(teamName, newTile);
    const updatedExploredTiles = [...new Set([...team.exploredTiles, newTile])];
    await databaseHelper.updateExploredTiles(teamName, updatedExploredTiles);

    // Create updated team data with the new currentLocation
    const updatedTeamData = {
      teamName: teamName,
      currentLocation: newTile,
      exploredTiles: updatedExploredTiles,
    };

    // Fetch the channel and send the map and event for the new tile
    const channelId = await databaseHelper.getTeamChannelId(teamName);
    const channel = await interaction.client.channels.fetch(channelId);
    if (channel) {
      await sendMapAndEvent(teamName, newTile, interaction, channel, 0, false, updatedTeamData);
    }

    await interaction.editReply({
      content: `Team ${teamName} moved to ${newTile}.`,
    });

  } catch (error) {
    logger(`Error moving team ${teamName}:`, error);
    await interaction.editReply({ content: 'Failed to move the team. Please try again later.' });
  }
}

module.exports = {
  calculateNewTile,
  handleDirectionMove,  // Export the new function
};
