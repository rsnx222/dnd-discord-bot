// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { calculateNewTile } = require('../core/movementLogic');
const { generateEventMessage } = require('../core/storylineManager');
const { generateMapImage } = require('../core/mapGenerator');
const { isHelper } = require('../helpers/permissionHelper');  // Add the helper check

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction or tile coordinate')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Optional: Select a team to move')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Check if the user is a helper
    if (!isHelper(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const teamData = await databaseHelper.getTeamData();
      const selectedTeam = interaction.options.getString('team');

      if (selectedTeam) {
        // Team is already selected from dropdown, proceed with selection
        return this.showMovementOptions(interaction, selectedTeam);
      }

      // If no team is selected, show the dropdown menu
      const teamSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_team')
        .setPlaceholder('Select a team')
        .addOptions(teamData.map(team => ({
          label: team.teamName,
          value: team.teamName,
        })));

      const row = new ActionRowBuilder().addComponents(teamSelectMenu);

      await interaction.editReply({
        content: 'Select a team to move:',
        components: [row],
      });
    } catch (error) {
      console.error('Error generating team select menu:', error);
      if (!interaction.replied) {
        await interaction.editReply({
          content: 'Failed to load teams. Please try again later.',
        });
      }
    }
  },

  async handleSelectMenu(interaction) {
    if (interaction.customId === 'select_team') {
      try {
        await interaction.deferUpdate();
        const selectedTeam = interaction.values[0];

        return this.showMovementOptions(interaction, selectedTeam);
      } catch (error) {
        console.error('Error handling select menu:', error);
        if (!interaction.replied) {
          await interaction.editReply({
            content: 'Failed to handle selection. Please try again later.',
          });
        }
      }
    }
  },

  async showMovementOptions(interaction, selectedTeam) {
    const movementButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('direction').setLabel('⬆️ Move with Directions').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tile_input').setLabel('Enter Tile Coordinate').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      content: `You selected ${selectedTeam}. Choose how you'd like to move:`,
      components: [movementButtons],
    });
  },

  async handleButton(interaction) {
    const teamName = interaction.message.content.match(/You selected (.+?)\./)[1];

    if (interaction.customId === 'direction') {
      // Show the direction buttons for movement
      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('north').setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('south').setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('west').setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('east').setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      return interaction.editReply({
        content: `Choose a direction to move ${teamName}:`,
        components: [directionButtons],
      });
    }

    if (interaction.customId === 'tile_input') {
      // Show a modal to input tile coordinate
      const modal = new ModalBuilder()
        .setCustomId('enter_tile_modal')
        .setTitle('Enter Tile Coordinate');

      const textInput = new TextInputBuilder()
        .setCustomId('tile_input')
        .setLabel('Enter a tile coordinate (e.g., A7)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(textInput);
      modal.addComponents(actionRow);

      return interaction.showModal(modal);
    }
  },

  async handleModal(interaction) {
    const teamName = interaction.message.content.match(/You selected (.+?)\./)[1];
    
    // Handle tile coordinate input
    if (interaction.customId === 'enter_tile_modal') {
      const enteredTile = interaction.fields.getTextInputValue('tile_input').toUpperCase();

      try {
        await interaction.deferReply({ ephemeral: true });

        const teamData = await databaseHelper.getTeamData();
        const team = teamData.find(t => t.teamName === teamName);

        if (!team) {
          throw new Error(`Could not find team data for ${teamName}`);
        }

        const tileData = await databaseHelper.getTileData(enteredTile);
        const eventMessage = tileData ? generateEventMessage(tileData) : `Your team has moved to ${enteredTile}. There doesn't seem to be anything unusual here.`;

        // Update the team's location
        await databaseHelper.updateTeamLocation(teamName, enteredTile);

        // Update the explored tiles
        const updatedExploredTiles = [...new Set([...team.exploredTiles, enteredTile])];
        await databaseHelper.updateExploredTiles(teamName, updatedExploredTiles);

        // Update the map
        const filteredTeamData = teamData.filter(t => t.teamName === teamName);
        const mapImagePath = await generateMapImage(filteredTeamData, false);

        const channelId = await databaseHelper.getTeamChannelId(teamName);
        const channel = await interaction.client.channels.fetch(channelId);

        if (channel) {
          await channel.send(eventMessage);
          await channel.send({ files: [mapImagePath] });
        }

        const teamChannelLink = `<#${channelId}>`;
        await interaction.editReply({
          content: `Team ${teamName} moved to ${enteredTile}. The update has been posted to the team's channel: ${teamChannelLink}.`,
        });

      } catch (error) {
        console.error(`Error moving team ${teamName}:`, error);
        await interaction.editReply({ content: 'Failed to move the team. Please try again later.' });
      }
    }
  }
};
