// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { calculateNewTile } = require('../core/movementLogic');
const { generateEventMessage } = require('../core/eventManager');
const { generateMapImage } = require('../core/mapGenerator');
const teamManager = require('../helpers/teamManager');
const { isHelper } = require('../helpers/permissionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction')
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

      // Present direction buttons for the selected team
      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`north_${selectedTeam}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`south_${selectedTeam}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`west_${selectedTeam}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`east_${selectedTeam}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({
        content: `You selected ${selectedTeam}. Choose a direction to move:`,
        components: [directionButtons],
      });
    } catch (error) {
      console.error('Error handling movement options:', error);
      await interaction.editReply({ content: 'Failed to handle the command. Please try again later.' });
    }
  },

  async handleButton(interaction) {
    const selectedTeam = interaction.customId.split('_').pop();  // Extract team name from button ID
    const direction = interaction.customId.split('_')[0];

    try {
      await interaction.deferReply({ ephemeral: true });

      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === selectedTeam);

      if (!team || !team.currentLocation) {
        throw new Error(`Could not find current location for team ${selectedTeam}`);
      }

      const currentLocation = team.currentLocation;
      const newTile = calculateNewTile(currentLocation, direction);

      if (!newTile) {
        return interaction.editReply({
          content: 'Invalid move. The team cannot move in that direction.',
        });
      }

      // **Ensure team data is updated first, then generate map**
      await databaseHelper.updateTeamLocation(selectedTeam, newTile);
      const updatedExploredTiles = [...new Set([...team.exploredTiles, newTile])];
      await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

      const teamDataUpdated = await databaseHelper.getTeamData();  // Get the updated team data
      const filteredTeamData = teamDataUpdated.filter(t => t.teamName === selectedTeam);

      const mapImagePath = await generateMapImage(filteredTeamData, false);  // Generate map after data update
      const tileData = await databaseHelper.getTileData(newTile);
      const eventMessage = tileData
        ? generateEventMessage(tileData)
        : `Your team moved ${direction} to ${newTile}. Looking out on the area you don’t see anything alarming so you set up camp and rest up...`;

      const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
      const channel = await interaction.client.channels.fetch(channelId);

      if (channel) {
        await channel.send(eventMessage);
        await channel.send({ files: [mapImagePath] });
      }

      const teamChannelLink = `<#${channelId}>`;
      await interaction.editReply({
        content: `Team ${selectedTeam} moved ${direction} to ${newTile}. The update has been posted to the team's channel: ${teamChannelLink}.`,
      });

    } catch (error) {
      console.error(`Error moving team ${selectedTeam}:`, error);
      await interaction.editReply({
        content: 'Failed to move the team. Please try again later.',
      });
    }
  }
};
