// sendMapAndEvent.js

const { generateMapImage } = require('./mapGenerator');
const { logger } = require('./logger');
const { generateEventMessage } = require('./eventManager'); // Assuming events are handled here

async function sendMapAndEvent(teamName, newTile, interaction, channel, eventIndex = 0, isEventComplete = false) {
  try {
    // Fetch team data and generate the map
    const mapImagePath = await generateMapImage([{ teamName, exploredTiles: [newTile] }], false);
    
    // Send the map image to the team's channel
    await channel.send({
      files: [{ attachment: mapImagePath, name: 'map.png' }],
      content: `Team ${teamName} has moved to tile ${newTile}.`,
    });

    // Handle the event at the new tile
    if (!isEventComplete) {
      const eventMessage = generateEventMessage({ tileName: newTile }, eventIndex);
      await channel.send(`Event starts for team ${teamName} at tile ${newTile}!\n${eventMessage}`);
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
