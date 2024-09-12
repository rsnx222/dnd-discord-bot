// resetallpositions.js

const { SlashCommandBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { isAdmin } = require('../helpers/permissionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetallpositions')
    .setDescription('Reset all team positions to A3'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // Ask for confirmation
    const confirmationMessage = await interaction.editReply({
      content: `Are you sure you want to reset all team positions and explored tiles to A3? Type 'confirm' to proceed.`,
    });

    // Collect the response
    const filter = response => response.user.id === interaction.user.id && response.content.toLowerCase() === 'confirm';
    const collector = confirmationMessage.channel.createMessageCollector({ filter, time: 10000 });

    collector.on('collect', async () => {
      const teamData = await databaseHelper.getTeamData();

      for (const team of teamData) {
        await databaseHelper.updateTeamLocation(team.teamName, 'A3');
        await databaseHelper.updateExploredTiles(team.teamName, ['A3']);
      }

      await interaction.editReply({ content: `All teams have been reset to A3 with only A3 as explored.` });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ content: 'Command canceled: No confirmation received.', ephemeral: true });
      }
    });
  }
};
