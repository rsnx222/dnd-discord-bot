const { ActionRowBuilder, ButtonBuilder } = require('discord.js');
const databaseHelper = require('./databaseHelper');
const { sendMapAndEvent } = require('./sendMapAndEvent');
const { logger } = require('./logger');
const tiles = require('../config/tiles');

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

  const MIN_COL_INDEX = 0;
  const MAX_COL_INDEX = 5;
  const MIN_ROW = 1;
  const MAX_ROW = 10;

  if (newColIndex < MIN_COL_INDEX || newColIndex > MAX_COL_INDEX || newRow < MIN_ROW || newRow > MAX_ROW) {
    logger('New position is out of bounds');
    return null;
  }

  const newColLetter = String.fromCharCode('A'.charCodeAt(0) + newColIndex);
  logger(`Final position: ${newColLetter}${newRow}`);
  return `${newColLetter}${newRow}`;
}

async function handleDirectionMove(interaction, teamName, direction) {
  try {
    const disabledButtons = interaction.message.components.map(row => {
      return new ActionRowBuilder().addComponents(
        row.components.map(button =>
          ButtonBuilder.from(button).setDisabled(true)
        )
      );
    });

    // Disable buttons and update the message
    await interaction.update({
      content: `Processing movement for team ${teamName}...`,
      components: disabledButtons,
    });

    const teamData = await databaseHelper.getTeamData(teamName); // Fetch specific team data using teamName
    if (!teamData || !teamData.currentLocation) {
      logger(`Could not find current location for team ${teamName}`);
      return interaction.channel.send({ content: 'Failed to move the team. Please try again later.' });
    }

    const currentLocation = teamData.currentLocation;
    const newTile = calculateNewTile(currentLocation, direction);

    if (!newTile) {
      return interaction.channel.send({ content: 'Invalid move. The team cannot move in that direction.' });
    }

    // Fetch tile data for new location
    const tileData = tiles[newTile];
    if (!tileData) {
      return interaction.channel.send({ content: 'No data available for this tile.' });
    }

    // Check if the tile has multiple events (transport link, challenge, boss, etc.)
    const hasTransportLink = tileData.event_type && tileData.event_type.includes('transport link');
    const transportDestination = tileData.destination;

    // Handle transport link event
    if (hasTransportLink && transportDestination) {
      logger(`Using transport link from ${newTile} to ${transportDestination}`);
      await databaseHelper.updateTeamLocation(teamName, transportDestination);
      await sendMapAndEvent(teamName, transportDestination, interaction, interaction.channel, 0, false, {
        teamName: teamName,
        currentLocation: transportDestination,
        exploredTiles: [...new Set([...teamData.exploredTiles, newTile, transportDestination])],
      });
      return;
    }

    // If no transport link, proceed with regular movement
    await databaseHelper.updateTeamLocation(teamName, newTile);
    const updatedExploredTiles = [...new Set([...teamData.exploredTiles, newTile])];
    await databaseHelper.updateExploredTiles(teamName, updatedExploredTiles);

    const updatedTeamData = {
      teamName: teamName,
      currentLocation: newTile,
      exploredTiles: updatedExploredTiles,
    };

    const channelId = await databaseHelper.getTeamChannelId(teamName);
    const channel = await interaction.client.channels.fetch(channelId);
    if (channel) {
      await sendMapAndEvent(teamName, newTile, interaction, channel, 0, false, updatedTeamData);
    }

  } catch (error) {
    logger(`Error moving team ${teamName}:`, error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.channel.send({ content: 'Failed to move the team. Please try again later.' });
    }
  }
}

module.exports = {
  calculateNewTile,
  handleDirectionMove,
};
