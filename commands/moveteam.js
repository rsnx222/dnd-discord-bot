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
    // Check if the user is a helper
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

      // Update the interaction with the movement options (use update instead of editReply)
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
    const [action, selectedTeam] = interaction.customId.split('_').slice(-2);

    if (action === 'move_by_direction') {
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
        const eventMessage = tileData ? generateEventMessage(tileData) : `Your team moved ${action} to ${newTile}. Looking out on the area you don’t see anything alarming so you set up camp and rest up...`;

        // Update the team's location in the database (ensure this is done before generating the map)
        await databaseHelper.updateTeamLocation(selectedTeam, newTile);

        // Update the explored tiles list
        const updatedExploredTiles = [...new Set([...team.exploredTiles, newTile])];
        await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

        // Re-fetch the updated team data after the move, then generate the map
        const refreshedTeamData = await databaseHelper.getTeamData();
        const filteredTeamData = refreshedTeamData.filter(t => t.teamName === selectedTeam);
        const mapImagePath = await generateMapImage(filteredTeamData, false);

        const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
        const channel = await interaction.client.channels.fetch(channelId);

        if (channel) {
          await channel.send(eventMessage);
          await channel.send({ files: [mapImagePath] });
        }

        const teamChannelLink = `<#${channelId}>`;
        await interaction.editReply({
          content: `Team ${selectedTeam} moved ${action} to ${newTile}. The update has been posted to the team's channel: ${teamChannelLink}.`,
        });

      } catch (error) {
        console.error(`Error moving team ${selectedTeam}:`, error);
        await interaction.editReply({
          content: 'Failed to move the team. Please try again later.',
        });
      }
    }
  },

  async handleModal(interaction) {
    const selectedTeam = interaction.customId.split('_').pop();

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

        // Update the team's location
        await databaseHelper.updateTeamLocation(selectedTeam, enteredTile);

        // Update the explored tiles
        const updatedExploredTiles = [...new Set([...team.exploredTiles, enteredTile])];
        await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

        // Generate the updated map
        const refreshedTeamData = await databaseHelper.getTeamData();
        const filteredTeamData = refreshedTeamData.filter(t => t.teamName === selectedTeam);
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
