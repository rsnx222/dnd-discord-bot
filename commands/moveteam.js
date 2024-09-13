// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { calculateNewTile } = require('../core/movementLogic');
const { generateEventMessage } = require('../core/eventManager');
const { generateMapImage } = require('../core/mapGenerator');
const teamManager = require('../helpers/teamManager');  // Team manager to generate team options
const { isHelper } = require('../helpers/permissionHelper');  // Permission helper

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction or entering a tile coordinate')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Select a team to move')
        .setRequired(true)
        .addChoices(...teamManager.getTeamOptions())  // Use the same dropdown for team selection
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
        new ButtonBuilder().setCustomId('move_by_direction').setLabel('⬆️ Move by Direction').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('enter_tile').setLabel('Enter Tile Coordinate').setStyle(ButtonStyle.Secondary)
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
    try {
      // Retrieve the selected team directly from the interaction message
      const selectedTeam = interaction.message.content.match(/You selected (.+?)\./);
      
      if (!selectedTeam || selectedTeam.length < 2) {
        throw new Error('Failed to retrieve selected team from message.');
      }

      const teamName = selectedTeam[1];  // Extract team name

      if (interaction.customId === 'move_by_direction') {
        // Show direction buttons for movement
        const directionButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('north').setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('south').setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('west').setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('east').setLabel('➡️ East').setStyle(ButtonStyle.Primary)
        );

        return interaction.update({
          content: `Choose a direction to move ${teamName}:`,
          components: [directionButtons],
        });
      }

      if (interaction.customId === 'enter_tile') {
        // Show a modal for entering the tile coordinate
        const modal = new ModalBuilder()
          .setCustomId('enter_tile_modal')
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
    } catch (error) {
      console.error('Error handling button interaction:', error);
      await interaction.followUp({ content: 'Failed to handle the button interaction.', ephemeral: true });
    }
  },

  async handleModal(interaction) {
    try {
      // Handle tile coordinate input
      const selectedTeam = interaction.message.content.match(/You selected (.+?)\./)[1];
      const enteredTile = interaction.fields.getTextInputValue('tile_coordinate').toUpperCase();

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

      // Update the map
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
      console.error('Error handling modal interaction:', error);
      await interaction.editReply({
        content: `Failed to handle tile coordinate input. ${error.message}`,
      });
    }
  }
};
