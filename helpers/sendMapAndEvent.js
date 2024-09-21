// sendMapAndEvent.js

const { generateMapImage } = require('./mapGenerator');
const { generateEventButtons } = require('./eventButtonHelper');
const { getTeamData } = require('./databaseHelper');
const { logger } = require('./logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tiles = require('../config/tiles');

function generateEventMessage(tileData, eventIndex = 0) {
  if (!tileData || !tileData.event_type) {
    logger('Tile data is missing or event_type is undefined:', tileData);
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
    case 'transport link':
      message = `This tile has a transport link. ${tileData.description}`;
      break;
    case 'reset':
      message = `
        Your team wakes up and finds themselves in a strange land... Some things look familiar... is this an alternate reality?!
        You find a crumpled note on the ground - you can barely make out the sentence:
        "*I can't believe we're finally here! Gone on ahead of you to the East - I'll meet you at the lair!* - **L**"
        (P.S. The first tile to the east holds a challenge...)
      `;
      break;
    default:
      message = `You have encountered something on this tile: ${tileData.description}`;
  }

  return message;
}

async function sendMapAndEvent(teamName, newTile, interaction, channel, eventIndex = 0, isEventComplete = false, teamData) {
  try {
    if (!newTile || typeof newTile !== 'string' || newTile.length < 2) {
      logger('Invalid tile format detected:', newTile);
      await interaction.editReply({ content: 'Invalid tile format detected. Please check the movement logic.' });
      return;
    }

    logger(`sendMapAndEvent called for team ${teamName}, tile ${newTile}`);

    // Ensure that teamData and exploredTiles are valid
    if (!teamData || !teamData.exploredTiles) {
      logger('teamData or exploredTiles is missing. Fetching the latest data...');
      // Fetch team data from the database or initialize default values
      teamData = await getTeamData(teamName);
      if (!teamData || !teamData.exploredTiles) {
        logger(`Failed to retrieve explored tiles for team ${teamName}`);
        await interaction.editReply({ content: 'Could not retrieve team data. Please try again later.' });
        return;
      }
    }

    const mapImagePath = await generateMapImage([teamData], false);
    logger(`Map generated for team ${teamName} at tile ${newTile}, image path: ${mapImagePath}`);

    await channel.send({
      files: [{ attachment: mapImagePath, name: 'map.png' }],
      content: `Team ${teamName} has moved to tile ${newTile}.`,
    });

    const tileData = tiles[newTile];
    if (!tileData) {
      logger(`Tile data not found for tile ${newTile}`);
      await interaction.editReply({ content: `No events found for tile ${newTile}. Setting up camp to rest.` });

      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`move_north_${teamName}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_south_${teamName}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_west_${teamName}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_east_${teamName}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      await channel.send({ content: 'You set up camp and rest for the night. Choose a direction to move:', components: [directionButtons] });
      return;
    }

    const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];

    if (eventTypes.includes('reset')) {
      const resetMessage = generateEventMessage(tileData, eventIndex);
      await channel.send(resetMessage);

      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`move_north_${teamName}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_south_${teamName}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_west_${teamName}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_east_${teamName}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      await channel.send({ content: 'Choose a direction to move:', components: [directionButtons] });
    } else {
      const eventMessage = generateEventMessage(tileData, eventIndex);
      await channel.send(`Event starts for team ${teamName} at tile ${newTile}!\n\n**${eventMessage}**\n\n> ${tileData.task}`);

      const eventButtons = generateEventButtons(eventTypes, teamName, isEventComplete);
      await channel.send({ components: [eventButtons] });
    }

    await interaction.editReply({ content: `Map and event sent for team ${teamName} at tile ${newTile}.` });

  } catch (error) {
    logger(`Error sending map and event for team ${teamName} at tile ${newTile}:`, error);
    await interaction.editReply({ content: 'Failed to send the map and event. Please try again later.' });
  }
}

module.exports = {
  sendMapAndEvent,
};
