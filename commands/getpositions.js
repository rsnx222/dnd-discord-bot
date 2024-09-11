// getpositions.js

const { SlashCommandBuilder } = require('discord.js');
const googleSheetsHelper = require('../googleSheetsHelper');
const settings = require('../settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getpositions')
    .setDescription('Show positions of all teams'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Use the helper method to get team data
      const teamData = await googleSheetsHelper.getTeamData();

      // Check if there is data
      if (!teamData || teamData.length === 0) {
        throw new Error('No data returned from Google Sheets.');
      }

      let locations = 'Current Team Locations:\n';

      teamData.forEach(row => {
        const { teamName, currentLocation } = row;
        const emoji = settings.teamEmojis[teamName] || '🔘'; // Default to '🔘' if no emoji found
        locations += `${emoji} ${teamName} is at ${currentLocation}\n`;
      });

      await interaction.editReply({ content: locations });
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      await interaction.editReply({ content: 'Failed to fetch data from Google Sheets.' });
    }
  },
};
