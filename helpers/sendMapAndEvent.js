const { generateMapImage } = require('./mapGenerator');
const { logger } = require('./logger');
const { generateEventMessage } = require('./eventManager');
const { generateEventButtons } = require('./eventButtonHelper');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const tiles = require('../config/tiles'); // Correct path to import tiles.js

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

    // Fetch tile data from tiles.js
    const tileData = tiles[newTile];
    if (!tileData) {
      logger(`Tile data not found for tile ${newTile}`);
      await interaction.editReply({ content: `No events found for tile ${newTile}.` });
      return;
    }

    const eventTypes = Array.isArray(tileData.event_type) ? tileData.event_type : [tileData.event_type];

    if (eventTypes.includes('reset')) {
      // Handle reset-specific message
      const resetMessage = `
        Your team wakes up and finds themselves in a strange land... Some things look similar to Gielinor... is this an alternate reality?!
        You find a crumpled note on the ground - you can barely make out the sentence:
        "*I can't believe we're finally here! Gone on ahead of you to the East - I'll meet you at the lair!* - **L**"
        (P.S. The first tile to the east holds a challenge...)
      `;
      await channel.send(resetMessage);

      // Generate directional buttons for reset
      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`move_north_${teamName}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_south_${teamName}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_west_${teamName}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_east_${teamName}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      await channel.send({ content: 'Choose a direction to move:', components: [directionButtons] });
    } else if (eventTypes.length === 0) {
      // No events on this tile, generate directional buttons
      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`move_north_${teamName}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_south_${teamName}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_west_${teamName}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`move_east_${teamName}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      await channel.send({ content: 'Choose a direction to move:', components: [directionButtons] });
    } else {
      // Handle events normally
      const eventMessage = generateEventMessage(tileData, eventIndex);
      await channel.send(`Event starts for team ${teamName} at tile ${newTile}!\n\n**${eventMessage}**\n\n> ${tileData.task}\n`);

      // Generate event buttons for the team to interact with
      const eventButtons = generateEventButtons(eventTypes, teamName, isEventComplete);
      await channel.send({ components: [eventButtons] });

      // REMOVE: Do not automatically complete the event
      // Action completion logic is handled by button interactions, not here!
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
