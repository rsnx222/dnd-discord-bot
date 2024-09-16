// sendMapAndEvent.js

const { generateMapImage } = require('./mapGenerator');
const { handleError } = require('./handleError');

async function sendMapAndEvent(teamName, newTile, interaction, channel, eventIndex = 0, isEventComplete = false) {
  try {
    // Generate the map for the current team
    const mapImageBuffer = await generateMapImage(teamName, newTile);
    
    // Send the map to the team's channel
    await channel.send({
      files: [{ attachment: mapImageBuffer, name: 'map.png' }],
      content: `Team ${teamName} has moved to tile ${newTile}.`,
    });

    // Optionally, handle any events if needed
    if (!isEventComplete) {
      // Trigger the next event (this can be expanded based on your event logic)
      await channel.send(`An event starts for team ${teamName} at tile ${newTile}! Event ${eventIndex}`);
    }

    // Acknowledge the action in the interaction
    await interaction.editReply({ content: `Map and event sent for team ${teamName}.` });

  } catch (error) {
    handleError(`Error sending map and event for team ${teamName}:`, error);
    await interaction.editReply({ content: 'Failed to send the map and event. Please try again later.' });
  }
}

module.exports = {
  sendMapAndEvent
};
