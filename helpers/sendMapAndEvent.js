// sendMapAndEvent.js

const { generateMapImage } = require('./mapGenerator');
const { logger } = require('./logger');
const { generateEventMessage, handleEventAction } = require('./eventManager');
const { generateEventButtons } = require('./eventButtonHelper');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseHelper = require('./databaseHelper');

async function sendMapAndEvent(teamName, newTile, interaction, channel, eventIndex = 0, isEventComplete = false, teamData) {
  try {
    // Validate the format of newTile before proceeding
    if (!newTile || typeof newTile !== 'string' || newTile.length < 2) {
      logger('Invalid tile format detected:', newTile);
      await interaction.editReply({ content: 'Invalid tile format detected. Please check the movement logic.' });
      return;
    }

    logger(`sendMapAndEvent called for team ${teamName}, tile ${newTile}`);

    // Fetch team data and generate the map
    const mapImagePath = await generateMapImage([teamData], false);
    logger(`Map generated for team ${teamName} at tile ${newTile}, image path: ${mapImagePath}`);
    
    // Send the map image to the team's channel
    await channel.send({
      files: [{ attachment: mapImagePath, name: 'map.png' }],
      content: `Team ${teamName} has moved to tile ${newTile}.`,
    });

    // Fetch tile data for event handling
    const tileData = await databaseHelper.getTileData(newTile);
    const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [];

    if (eventTypes.length === 0) {
      // No events on this tile, generate directional buttons
      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`move_north_${teamName}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_south_${teamName}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_west_${teamName}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_east_${teamName}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      logger(`No events found for tile ${newTile}. Sending directional buttons.`);
      await channel.send({ content: 'Choose a direction to move:', components: [directionButtons] });
    } else {
      // There are events on this tile, generate event buttons
      const eventMessage = generateEventMessage({ tileName: newTile }, eventIndex);
      await channel.send(`Event starts for team ${teamName} at tile ${newTile}!\n${eventMessage}`);

      const eventButtons = generateEventButtons(eventTypes, teamName, isEventComplete);
      await channel.send({ components: [eventButtons] });

      // Handle event actions (if applicable)
      const actionResult = await handleEventAction('complete', { tileName: newTile }, eventIndex, teamData);
      await channel.send(actionResult);
    }

    // Acknowledge the successful sending of the map and event
    await interaction.editReply({ content: `Map and event sent for team ${teamName} at tile ${newTile}.` });

  } catch (error) {
    logger(`Error sending map and event for team ${teamName} at tile ${newTile}:`, error);
    await interaction.editReply({ content: 'Failed to send the map and event. Please try again later.' });
  }
}

module.exports = {
  sendMapAndEvent,
};
