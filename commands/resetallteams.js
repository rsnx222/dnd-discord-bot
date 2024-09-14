// resetallteams.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { isOwner } = require('../helpers/permissionHelper');
const { generateMapImage } = require('../core/mapGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetallteams')
    .setDescription('Reset all team positions to A5'),

  async execute(interaction) {
    if (!isOwner(interaction.user)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const modal = createConfirmationModal('reset_all_teams_modal', `confirm_reset_all`, `Type "confirm" to reset all teams to A5`);
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (interaction.customId !== 'reset_all_teams_modal') return;

    // Ensure the interaction is deferred to avoid timeouts
    await interaction.deferReply({ ephemeral: true });

    const confirmationText = interaction.fields.getTextInputValue('confirm_reset_all');

    if (confirmationText.toLowerCase() === 'confirm') {
      const teamData = await databaseHelper.getTeamData();

      for (const team of teamData) {
        await databaseHelper.updateTeamLocation(team.teamName, 'A5');
        await databaseHelper.updateExploredTiles(team.teamName, ['A5']);

        const filteredTeamData = teamData.filter(t => t.teamName === team.teamName);
        const mapImagePath = await generateMapImage(filteredTeamData, false);

        const channelId = await databaseHelper.getTeamChannelId(team.teamName);
        const channel = await interaction.client.channels.fetch(channelId);

        if (channel) {
          const welcomeMessage = `All teams have been reset. Begin your journey again from A5!`;
          await channel.send(welcomeMessage);
          await channel.send({ files: [mapImagePath] });
        }
      }

      // Use editReply to finalize the deferred interaction
      await interaction.editReply({ content: 'All teams have been reset to A5 with only A5 as explored.', ephemeral: true });
    } else {
      // Handle failure case when "confirm" is not typed
      await interaction.editReply({ content: 'Confirmation failed. You did not type "confirm".', ephemeral: true });
    }
  }
};

// Helper function to create the confirmation modal
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
