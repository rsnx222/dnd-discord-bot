// rejectScreenshot.js

const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { rejectScreenshot } = require('../helpers/approveRejectScreenshot');
const { getTeamLocation } = require('../helpers/databaseHelper');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Reject Screenshot')
    .setType(ApplicationCommandType.Message),  // Attach to a message (right-click context menu)

  async execute(interaction) {
    const teamName = extractTeamNameFromChannel(interaction.channel.name);  // Get team name from channel
    const currentTile = await getTeamLocation(teamName);  // Get the team's current tile

    const taskData = getTaskForTile(currentTile);  // Fetch task data from tiles.js based on tile

    if (!taskData) {
      await interaction.reply({ content: 'No task found for this screenshot.', ephemeral: true });
      return;
    }

    await rejectScreenshot(interaction, teamName, currentTile);  // Use current tile instead of event name
  }
};

function extractTeamNameFromChannel(channelName) {
  return channelName.charAt(0).toUpperCase() + channelName.slice(1).toLowerCase();  // Converts 'orange' to 'Orange'
}

function getTaskForTile(tile) {
  // Logic to fetch task details from tiles.js
  const tiles = require('../config/tiles');
  return tiles[tile] ? tiles[tile] : null;  // Fetch task data for the tile
}
