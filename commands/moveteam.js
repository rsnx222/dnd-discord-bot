// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const googleSheetsHelper = require('../googleSheetsHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction'),
    
  async execute(interaction) {
    try {
      // Fetch the team data from Google Sheets
      const teamData = await googleSheetsHelper.getTeamData();

      // Generate team options for the select menu
      const teamSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_team')
        .setPlaceholder('Select a team')
        .addOptions(teamData.map(team => ({
          label: team.teamName,
          value: team.teamName,
        }))); // Dynamically generate team options from Google Sheets data

      const row = new ActionRowBuilder().addComponents(teamSelectMenu);

      await interaction.reply({
        content: 'Select a team to move:',
        components: [row],
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error generating team select menu:', error);
      await interaction.reply({
        content: 'Failed to load teams. Please try again later.',
        ephemeral: true,
      });
    }
  },
};
