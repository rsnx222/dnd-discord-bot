// resetallteams.js

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
      try {
        const teamData = await databaseHelper.getTeamData();

        for (const team of teamData) {
          await resetTeam(team, interaction);
        }

        // Once all teams are reset, reply with a success message
        await interaction.editReply({ content: 'All teams have been reset to A5 with only A5 as explored.', ephemeral: true });
      } catch (error) {
        console.error('Error resetting all teams:', error);
        await interaction.editReply({ content: 'Failed to reset all teams. Please try again later.', ephemeral: true });
      }
    } else {
      await interaction.editReply({ content: 'Confirmation failed. You did not type "confirm".', ephemeral: true });
    }
  }
};

// Helper function to reset a team and send their map
async function resetTeam(team, interaction) {
  try {
    // Update the team's location and explored tiles
    await databaseHelper.updateTeamLocation(team.teamName, 'A5');
    await databaseHelper.updateExploredTiles(team.teamName, ['A5']);

    // Generate the map for the team
    const filteredTeamData = [team];  // Pass only the current team
    const mapImagePath = await generateMapImage(filteredTeamData, false);

    // Fetch the team's channel and send the update
    const channelId = await databaseHelper.getTeamChannelId(team.teamName);
    const channel = await interaction.client.channels.fetch(channelId);

    if (channel) {
      const welcomeMessage = `Your team has been reset. Start your journey again from A5!`;
      await channel.send(welcomeMessage);
      await channel.send({ files: [mapImagePath] });
    }
  } catch (error) {
    console.error(`Error resetting team ${team.teamName}:`, error);
    // Optionally log or handle errors per team, but don't block the whole process
  }
}

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
