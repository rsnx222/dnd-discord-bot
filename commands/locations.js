// locations.js

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
      const range = 'Teams!A2:D'; // Adjust this range as needed
      const response = await googleSheetsHelper.spreadsheets.values.get({
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
