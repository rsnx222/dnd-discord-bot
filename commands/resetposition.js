// resetposition.js

const { SlashCommandBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { isAdmin } = require('../helpers/permissionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetposition')
    .setDescription('Reset the position of a specific team to A3')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Team to reset')
        .setRequired(true)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const teamName = interaction.options.getString('team');

    await interaction.deferReply({ ephemeral: true });

    // Ask for confirmation
    const confirmationMessage = await interaction.editReply({
      content: `Are you sure you want to reset ${teamName}'s position and explored tiles? Type 'confirm' to proceed.`,
    });

    // Collect the response
    const filter = response => response.user.id === interaction.user.id && response.content.toLowerCase() === 'confirm';
    const collector = confirmationMessage.channel.createMessageCollector({ filter, time: 10000 });

    collector.on('collect', async () => {
      // Reset the team's location and explored tiles
      await databaseHelper.updateTeamLocation(teamName, 'A3');
      await databaseHelper.updateExploredTiles(teamName, ['A3']);

      await interaction.editReply({ content: `${teamName} has been reset to A3 with only A3 as explored.` });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'Command canceled: No confirmation received.', ephemeral: true });
      }
    });
  }
};