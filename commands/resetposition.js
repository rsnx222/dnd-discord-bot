const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
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

    // Create a modal for confirmation
    const modal = new ModalBuilder()
      .setCustomId('reset_team_modal')
      .setTitle('Confirm Reset');

    const textInput = new TextInputBuilder()
      .setCustomId('confirm_team_name')
      .setLabel(`Type the team name (${selectedTeam}) to confirm:`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(textInput);
    modal.addComponents(actionRow);

    // Show the modal to the user
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (interaction.customId === 'reset_team_modal') {
      const enteredTeamName = interaction.fields.getTextInputValue('confirm_team_name');
      const selectedTeam = interaction.message.content.match(/Team to reset: (.+?)\./)[1];

      // Check if the entered team name matches the selected one
      if (enteredTeamName === selectedTeam) {
        await databaseHelper.updateTeamLocation(selectedTeam, 'A3');
        await databaseHelper.updateExploredTiles(selectedTeam, ['A3']);

        await interaction.reply({ content: `${selectedTeam} has been reset to A3 with only A3 as explored.`, ephemeral: true });
      } else {
        await interaction.reply({ content: 'Confirmation failed. The entered team name did not match.', ephemeral: true });
      }
    }
  }
};
