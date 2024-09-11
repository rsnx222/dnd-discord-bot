// locations.js

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const settings = require('../settings');
const googleSheetsHelper = require('../googleSheetsHelper');  // For interacting with Google Sheets
const teamManager = require('../teamManager');  // If needed for team-related logic

module.exports = {
  data: {
    name: 'getpositions',
    description: 'Show positions of all teams',
  },
  async execute(interaction, sheets, settings) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const range = 'Teams!A2:D'; // Adjust this range as needed
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: settings.spreadsheetId,
        range,
      });

      const teamData = response.data.values || [];
      let locations = 'Current Team Locations:\n';

      teamData.forEach(row => {
        const [teamName, currentLocation] = row;
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
