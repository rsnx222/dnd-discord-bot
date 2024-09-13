// resetpositions.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const teamManager = require('../helpers/teamManager');
const { isAdmin } = require('../helpers/permissionHelper');

module.exports = {
  data: [
    new SlashCommandBuilder()
      .setName('resetposition')
      .setDescription('Reset the position of a specific team to A3')
      .addStringOption(option =>
        option.setName('team')
          .setDescription('Team to reset')
          .setRequired(true)
          .addChoices(...teamManager.getTeamOptions())),  // Dynamically generate team options

    new SlashCommandBuilder()
      .setName('resetallpositions')
      .setDescription('Reset all team positions to A3')
  ],

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    if (interaction.commandName === 'resetposition') {
      const selectedTeam = interaction.options.getString('team');
      const modal = createConfirmationModal(`reset_team_modal_${selectedTeam}`, `Type the team name (${selectedTeam}) to confirm:`);
      await interaction.showModal(modal);
    } else if (interaction.commandName === 'resetallpositions') {
      const modal = createConfirmationModal('reset_all_teams_modal', `Type 'confirm' to reset all teams to A3`);
      await interaction.showModal(modal);
    }
  },

  async handleModal(interaction) {
    if (interaction.customId.startsWith('reset_team_modal_')) {
      const selectedTeam = interaction.customId.split('_').pop();  // Extract the team name
      const enteredTeamName = interaction.fields.getTextInputValue('confirm_team_name');

      if (enteredTeamName === selectedTeam) {
        await databaseHelper.updateTeamLocation(selectedTeam, 'A3');
        await databaseHelper.updateExploredTiles(selectedTeam, ['A3']);
        await interaction.reply({ content: `${selectedTeam} has been reset to A3 with only A3 as explored.`, ephemeral: true });
      } else {
        await interaction.reply({ content: 'Confirmation failed. The entered team name did not match.', ephemeral: true });
      }
    } else if (interaction.customId === 'reset_all_teams_modal') {
      const confirmationText = interaction.fields.getTextInputValue('confirm_reset_all');

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

// Helper function to create a confirmation modal
function createConfirmationModal(customId, labelText) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Confirm Reset');

  const textInput = new TextInputBuilder()
    .setCustomId('confirm_team_name')
    .setLabel(labelText)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(textInput);
  modal.addComponents(actionRow);

  return modal;
}
