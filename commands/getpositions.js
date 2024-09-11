// getpositions.js

const { SlashCommandBuilder } = require('discord.js');
const databaseHelper = require('../databaseHelper');
const settings = require('../settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getpositions')
    .setDescription('Show positions of all teams'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Use the helper method to get team data from the database
      const teamData = await databaseHelper.getTeamData();

      // Check if there is data
      if (!teamData || teamData.length === 0) {
        throw new Error('No team data returned from the database.');
      }

      let locations = 'Current Team Locations:\n';

      teamData.forEach(row => {
        const teamName = row.teamName;
        const currentLocation = row.currentLocation;

        // Check for undefined values in the row
        if (!teamName || !currentLocation) {
          console.error('Team name or location is undefined');
          locations += 'Error: team name or location is missing.\n';
        } else {
          const emoji = settings.teamEmojis[teamName] || '🔘'; // Default to '🔘' if no emoji is found
          locations += `${emoji} ${teamName} is at ${currentLocation}\n`;
        }
      });

      await interaction.editReply({ content: locations });
    } catch (error) {
      console.error('Error fetching data from the database:', error);
      await interaction.editReply({ content: 'Failed to fetch team positions from the database.' });
    }
  },
};
