// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const teamManager = require('../teamManager');  // Handles team-related logic

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction'),
    
  async execute(interaction) {
    const teamSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_team')
      .setPlaceholder('Select a team')
      .addOptions(teamManager.getTeamOptions()); // Get team options from teamManager

    const row = new ActionRowBuilder().addComponents(teamSelectMenu);

    await interaction.reply({
      content: 'Select a team to move:',
      components: [row],
      ephemeral: true,
    });
  },
};
