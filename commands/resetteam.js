// resetteam.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const teamManager = require('../helpers/teamManager');
const { isOwner } = require('../helpers/permissionHelper');
const { generateMapImage } = require('../core/mapGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetteam')
    .setDescription('Reset the position of a specific team to A5')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Team to reset')
        .setRequired(true)
        .addChoices(...teamManager.getTeamOptions())),

  async execute(interaction) {
    if (!isOwner(interaction.user)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const selectedTeam = interaction.options.getString('team');
    const modal = createConfirmationModal(`reset_team_modal_${selectedTeam}`, `confirm_team_name`, `Type the team name (${selectedTeam}) to confirm:`);
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (!interaction.customId.startsWith('reset_team_modal_')) return;

    const selectedTeam = interaction.customId.split('_').pop();
    const enteredTeamName = interaction.fields.getTextInputValue('confirm_team_name');

    if (enteredTeamName.toLowerCase() === selectedTeam.toLowerCase()) {
      await databaseHelper.updateTeamLocation(selectedTeam, 'A5');
      await databaseHelper.updateExploredTiles(selectedTeam, ['A5']);

      const teamData = await databaseHelper.getTeamData();
      const filteredTeamData = teamData.filter(t => t.teamName === selectedTeam);
      const mapImagePath = await generateMapImage(filteredTeamData, false);

      const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
      const channel = await interaction.client.channels.fetch(channelId);

      if (channel) {
        const welcomeMessage = `Your team wakes up in a strange land... Prepare for your journey!`;
        await channel.send(welcomeMessage);
        await channel.send({ files: [mapImagePath] });
      }

      await interaction.followUp({ content: `${selectedTeam} has been reset to A5 with only A5 as explored.`, ephemeral: true });
    } else {
      await interaction.followUp({ content: 'Confirmation failed. The entered team name did not match.', ephemeral: true });
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
