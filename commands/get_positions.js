// getpositions.js

const { SlashCommandBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const settings = require('../config/settings');
const { logger } = require('../helpers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('get_positions')
    .setDescription('Show positions of all teams'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch team data from the database
      const teamData = await databaseHelper.getTeamData();

      // Handle case if no data is returned
      if (!teamData || teamData.length === 0) {
        logger('No team data returned from the database.');
        return interaction.editReply({ content: 'No team data available.', ephemeral: true });
      }

      let locations = 'Current Team Locations:\n';

      teamData.forEach(row => {
        const teamName = row.teamName;
        const currentLocation = row.currentLocation;

        // Handle missing or undefined values for teamName and currentLocation
        if (!teamName || !currentLocation) {
          logger('Team name or location is undefined', { teamName, currentLocation });
          locations += 'Error: team name or location is missing.\n';
        } else {
          // Use an emoji if available, otherwise fall back to the default '🔘'
          const emoji = settings.teamEmojis[teamName] || '🔘';
          locations += `${emoji} ${teamName} is at ${currentLocation}\n`;
        }
      });

      // Reply with the formatted list of team locations
      await interaction.editReply({ content: locations, ephemeral: true });

    } catch (error) {
      logger('Error fetching team data from the database:', error);
      await interaction.editReply({ content: 'Failed to fetch team positions from the database.', ephemeral: true });
    }
  },
};
