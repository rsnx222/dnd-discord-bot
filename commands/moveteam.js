// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { calculateNewTile } = require('../core/movementLogic');
const { generateEventMessage } = require('../core/eventManager');
const { generateMapImage } = require('../core/mapGenerator');
const teamManager = require('../helpers/teamManager');
const { isHelper } = require('../helpers/permissionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction or entering a tile coordinate')
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

    try {
      await interaction.deferReply({ ephemeral: true });

      const selectedTeam = interaction.options.getString('team');

      // Present options for moving by direction or entering a tile coordinate
      const movementOptions = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`move_by_direction_${selectedTeam}`).setLabel('⬆️ Move by Direction').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`enter_tile_${selectedTeam}`).setLabel('Enter Tile Coordinate').setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({
        content: `You selected ${selectedTeam}. Choose how you'd like to move:`,
        components: [movementOptions],
      });
    } catch (error) {
      console.error('Error handling movement options:', error);
      await interaction.editReply({ content: 'Failed to handle selection. Please try again later.' });
    }
  },

  async handleButton(interaction) {
    // Extract the selected team from the button custom ID
    const [action, selectedTeam] = interaction.customId.split('_').slice(-2);

    if (action === 'move_by_direction') {
      // Show direction buttons for movement
      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`north_${selectedTeam}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`south_${selectedTeam}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`west_${selectedTeam}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`east_${selectedTeam}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      return interaction.update({
        content: `Choose a direction to move ${selectedTeam}:`,
        components: [directionButtons],
      });
    }

    if (action === 'enter_tile') {
      // Show a modal for entering the tile coordinate
      const modal = new ModalBuilder()
        .setCustomId(`enter_tile_modal_${selectedTeam}`)
        .setTitle('Enter Tile Coordinate');

      const textInput = new TextInputBuilder()
        .setCustomId('tile_coordinate')
        .setLabel('Enter a tile coordinate (e.g., A7)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(textInput);
      modal.addComponents(actionRow);

      return interaction.showModal(modal);
    }

    // Handle direction buttons (north, south, etc.)
    if (['north', 'south', 'west', 'east'].includes(action)) {
      try {
        await interaction.deferReply({ ephemeral: true });

        const teamData = await databaseHelper.getTeamData();
        const team = teamData.find(t => t.teamName === selectedTeam);

        if (!team || !team.currentLocation) {
          throw new Error(`Could not find current location for team ${selectedTeam}`);
        }

        const currentLocation = team.currentLocation;
        const newTile = calculateNewTile(currentLocation, action);

        if (!newTile) {
          return interaction.editReply({
            content: 'Invalid move. The team cannot move in that direction.',
          });
        }

        const tileData = await databaseHelper.getTileData(newTile);
        const eventMessage = tileData
          ? generateEventMessage(tileData)
          : `Your team moved ${action} to ${newTile}. Looking out on the area you don’t see anything alarming, so you set up camp and rest up.`;

        await databaseHelper.updateTeamLocation(selectedTeam, newTile);

        const updatedExploredTiles = [...new Set([...team.exploredTiles, newTile])];
        await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

        const filteredTeamData = teamData.filter(t => t.teamName === selectedTeam);
        const mapImagePath = await generateMapImage(filteredTeamData, false);

        const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
        const channel = await interaction.client.channels.fetch(channelId);

        if (channel) {
          await channel.send(eventMessage);
          await channel.send({ files: [mapImagePath] });
        }

        return interaction.editReply({
          content: `Team ${selectedTeam} moved ${action} to ${newTile}. The update has been posted to the team's channel.`,
        });

      } catch (error) {
        console.error(`Error moving team ${selectedTeam}:`, error);
        return interaction.editReply({
          content: 'Failed to move the team. Please try again later.',
        });
      }
    }
  },

  async handleModal(interaction) {
    const selectedTeam = interaction.customId.split('_').slice(-1)[0]; // Get team from modal ID

    // Handle tile coordinate input
    if (interaction.customId.startsWith('enter_tile_modal')) {
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
  }
};
