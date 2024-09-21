// checkTaskStatus.js

const { SlashCommandBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const tiles = require('../config/tiles');
const { logger } = require('../helpers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_task_status')
    .setDescription('Check the status of your team\'s current task.'),

  async execute(interaction) {
    try {
      const teamName = interaction.user.username; // Assuming username matches team name, adjust as needed
      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === teamName);

      if (!team || !team.currentLocation) {
        return interaction.reply({ content: 'Could not find your current team location.', ephemeral: true });
      }

      const currentTile = team.currentLocation;
      const tileData = tiles[currentTile];

      if (!tileData || (!tileData.requiredScreenshots && !tileData.requiredItems)) {
        return interaction.reply({ content: 'There is no task on your current tile.', ephemeral: true });
      }

      const eventProgress = await databaseHelper.getEventProgress(teamName, currentTile);
      let remaining = 0;
      let message = '';

      if (tileData.requiredScreenshots) {
        remaining = tileData.requiredScreenshots - eventProgress.approvedScreenshots;
        message = `You need to submit ${remaining} more screenshots to complete the task.`;
      } else if (tileData.requiredItems) {
        remaining = tileData.requiredItems - eventProgress.approvedItems;
        message = `You need to submit ${remaining} more items to complete the task.`;
      }

      return interaction.reply({ content: `Current task on tile ${currentTile}: ${tileData.description}\n\n${message}`, ephemeral: true });
    } catch (error) {
      logger('Error checking task status:', error);
      return interaction.reply({ content: 'An error occurred while checking your task status. Please try again later.', ephemeral: true });
    }
  }
};
