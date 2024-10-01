const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { createDirectionButtons, sendMapAndEvent } = require('../helpers/sendMapAndEvent');
const { getTeams } = require('../helpers/getTeams');
const { checkRole } = require('../helpers/checkRole'); 
const { logger } = require('../helpers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset_team')
    .setDescription('Reset the position of a specific team to A5')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Team to reset')
        .setRequired(true)
        .addChoices(...getTeams())
    ), 

  async execute(interaction) {
    if (!checkRole(interaction.member, 'owner')) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const selectedTeam = interaction.options.getString('team');
    const modal = createConfirmationModal(`reset_team_modal_${selectedTeam}`, `confirm_team_name`, `Type the team name (${selectedTeam}) to confirm:`);

    // Show the modal (no deferReply before this)
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    try {
      const selectedTeam = interaction.customId.split('_').pop();
      const enteredTeamName = interaction.fields.getTextInputValue('confirm_team_name');

      if (enteredTeamName.toLowerCase() === selectedTeam.toLowerCase()) {
        logger(`Team name matches. Resetting team ${selectedTeam}.`);

        // Defer reply to indicate processing after modal submission
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({ content: 'Processing the reset, please wait...', ephemeral: true });

        // Reset the team location and explored tiles
        await databaseHelper.updateTeamLocation(selectedTeam, 'A5');
        await databaseHelper.updateExploredTiles(selectedTeam, ['A5']);

        // Reset the team's task progress, screenshots, and rewards/penalties
        await databaseHelper.resetEventProgress(selectedTeam);
        await databaseHelper.resetProcessedScreenshots(selectedTeam);
        await databaseHelper.resetTeamRewardsPenalties(selectedTeam);

        const teamData = {
          teamName: selectedTeam,
          currentLocation: 'A5',
          exploredTiles: ['A5'],
        };

        // Fetch team channel and send map and event
        const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
        const channel = await interaction.client.channels.fetch(channelId);

        await sendMapAndEvent(selectedTeam, 'A5', interaction, channel, 0, false, teamData);
        
        await interaction.editReply({ content: `${selectedTeam} has been fully reset to A5 with only A5 as explored. All task progress, screenshots, and rewards have been reset.`, ephemeral: true });
      
      } else {
        logger('Team name mismatch.');
        await interaction.reply({ content: 'Confirmation failed. The entered team name did not match.', ephemeral: true });
      }
    } catch (error) {
      logger('Error handling modal interaction:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred during the reset process.', ephemeral: true });
      }
    }
  }

};

function createConfirmationModal(customId, inputId, labelText) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Confirm Reset');

  const textInput = new TextInputBuilder()
    .setCustomId(inputId)
    .setLabel(labelText)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const actionRow = new ActionRowBuilder().addComponents(textInput);
  modal.addComponents(actionRow);

  return modal;
}
