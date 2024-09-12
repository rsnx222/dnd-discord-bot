const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
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

    // Create a modal for confirmation
    const modal = new ModalBuilder()
      .setCustomId('reset_all_teams_modal')
      .setTitle('Confirm Reset All Teams');

    const textInput = new TextInputBuilder()
      .setCustomId('confirm_reset_all')
      .setLabel(`Type 'confirm' to reset all teams to A3`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(textInput);
    modal.addComponents(actionRow);

    // Show the modal to the user
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (interaction.customId === 'reset_all_teams_modal') {
      const confirmationText = interaction.fields.getTextInputValue('confirm_reset_all');

      // Check if the entered text is 'confirm'
      if (confirmationText.toLowerCase() === 'confirm') {
        const teamData = await databaseHelper.getTeamData();

        // Reset all teams to A3 and set explored tiles to ['A3']
        for (const team of teamData) {
          await databaseHelper.updateTeamLocation(team.teamName, 'A3');
          await databaseHelper.updateExploredTiles(team.teamName, ['A3']);
        }

        await interaction.reply({ content: 'All teams have been reset to A3 with only A3 as explored.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Confirmation failed. You did not type "confirm".', ephemeral: true });
      }
    }
  }
};
