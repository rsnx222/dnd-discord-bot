// moveteamcoord.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { isHelper } = require('../helpers/permissionHelper');
const { sendMapAndEvent } = require('../helpers/teamMovementHelper');
const teamManager = require('../helpers/teamManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteamcoord')
    .setDescription('Move a team to a specific tile coordinate')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Select a team to move')
        .setRequired(true)
        .addChoices(...teamManager.getTeamOptions())
    ),

  async execute(interaction) {
    if (!isHelper(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const selectedTeam = interaction.options.getString('team');

    const modal = new ModalBuilder()
      .setCustomId(`moveteamcoord_${selectedTeam}`)
      .setTitle('Enter Tile Coordinate');

    const textInput = new TextInputBuilder()
      .setCustomId('tile_coordinate')
      .setLabel('Enter a tile coordinate (e.g., A7)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(textInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    if (!interaction.customId.startsWith('moveteamcoord_')) return;

    const selectedTeam = interaction.customId.split('_').pop();
    const enteredTile = interaction.fields.getTextInputValue('tile_coordinate').toUpperCase();

    try {
      await interaction.deferReply({ ephemeral: true });

      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === selectedTeam);

      await databaseHelper.updateTeamLocation(selectedTeam, enteredTile);
      const updatedExploredTiles = [...new Set([...team.exploredTiles, enteredTile])];
      await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

      const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
      const channel = await interaction.client.channels.fetch(channelId);

      await sendMapAndEvent(selectedTeam, enteredTile, interaction, channel);
    } catch (error) {
      console.error(`Error moving team ${selectedTeam}:`, error);
      await interaction.editReply({ content: 'Failed to move the team. Please try again later.' });
    }
  },
};
