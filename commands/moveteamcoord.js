// moveteamcoord.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { generateEventMessage } = require('../core/eventManager');
const { generateMapImage } = require('../core/mapGenerator');
const { isHelper } = require('../helpers/permissionHelper');

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
      .setCustomId(`enter_tile_${selectedTeam}`)
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
    const selectedTeam = interaction.customId.split('_').pop();
    const enteredTile = interaction.fields.getTextInputValue('tile_coordinate').toUpperCase();

    try {
      await interaction.deferReply({ ephemeral: true });

      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === selectedTeam);

      if (!team) {
        throw new Error(`Could not find team data for ${selectedTeam}`);
      }

      const tileData = await databaseHelper.getTileData(enteredTile);
      const eventMessage = tileData
        ? generateEventMessage(tileData)
        : `Your team has moved to ${enteredTile}. There doesn't seem to be anything unusual here.`;

      await databaseHelper.updateTeamLocation(selectedTeam, enteredTile);

      const updatedExploredTiles = [...new Set([...team.exploredTiles, enteredTile])];
      await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

      const filteredTeamData = teamData.filter(t => t.teamName === selectedTeam);
      const mapImagePath = await generateMapImage(filteredTeamData, false);

      const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
      const channel = await interaction.client.channels.fetch(channelId);

      if (channel) {
        await channel.send(eventMessage);
        await channel.send({ files: [mapImagePath] });
      }

      await interaction.editReply({
        content: `Team ${selectedTeam} moved to ${enteredTile}. The update has been posted to the team's channel.`,
      });

    } catch (error) {
      console.error(`Error moving team ${selectedTeam}:`, error);
      await interaction.editReply({
        content: 'Failed to move the team. Please try again later.',
      });
    }
  }
};
