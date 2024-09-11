// moveteam.js

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const settings = require('../settings');
const googleSheetsHelper = require('../googleSheetsHelper');  // For interacting with Google Sheets
const teamManager = require('../teamManager');  // If needed for team-related logic

module.exports = {
  data: {
    name: 'moveteam',
    description: 'Move a team by selecting a direction',
  },
  async execute(interaction, settings) {
    const teamSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_team')
      .setPlaceholder('Select a team')
      .addOptions(getTeamOptions(settings.teamEmojis)); // You can pass settings here

    const row = new ActionRowBuilder().addComponents(teamSelectMenu);

    await interaction.reply({
      content: 'Select a team to move:',
      components: [row],
      ephemeral: true,
    });
  },
};
