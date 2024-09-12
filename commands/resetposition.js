// resetposition.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const teamManager = require('../helpers/teamManager');
const { isAdmin } = require('../helpers/permissionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetposition')
    .setDescription('Reset the position of a specific team to A3')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Team to reset')
        .setRequired(true)
        .addChoices(...teamManager.getTeamOptions())),  // Dynamically generate team options from teamManager

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const selectedTeam = interaction.options.getString('team');

    await interaction.deferReply({ ephemeral: true });

    const confirmationMessage = await interaction.editReply({
      content: `Are you sure you want to reset ${selectedTeam}'s position and explored tiles? Type 'confirm' to proceed.`,
    });

    const filter = response => response.user.id === interaction.user.id && response.content.toLowerCase() === 'confirm';
    const collector = confirmationMessage.channel.createMessageCollector({ filter, time: 10000 });

    collector.on('collect', async () => {
      await databaseHelper.updateTeamLocation(selectedTeam, 'A3');
      await databaseHelper.updateExploredTiles(selectedTeam, ['A3']);

      await interaction.editReply({ content: `${selectedTeam} has been reset to A3 with only A3 as explored.` });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'Command canceled: No confirmation received.', ephemeral: true });
      }
    });
  }
};
