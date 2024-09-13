const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { calculateNewTile } = require('../core/movementLogic');
const { generateEventMessage } = require('../core/storylineManager');
const { generateMapImage } = require('../core/mapGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Optional: Select a team to move')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const teamData = await databaseHelper.getTeamData();
      const selectedTeam = interaction.options.getString('team');

      if (selectedTeam) {
        // Team is already selected from dropdown, proceed with direction selection
        return this.showDirectionSelection(interaction, selectedTeam);
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

        return this.showDirectionSelection(interaction, selectedTeam);
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

  async showDirectionSelection(interaction, selectedTeam) {
    const directionButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('north').setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('south').setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('west').setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('east').setLabel('➡️ East').setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({
      content: `You selected ${selectedTeam}. Now choose the direction:`,
      components: [directionButtons],
    });
  },

  async handleButton(interaction) {
    const direction = interaction.customId;
    const teamName = interaction.message.content.match(/You selected (.+?)\./)[1];

    try {
      // Defer to ensure interaction validity
      await interaction.deferReply({ ephemeral: true });

      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === teamName);

      if (!team || !team.currentLocation) {
        throw new Error(`Could not find current location for team ${teamName}`);
      }

      const currentLocation = team.currentLocation;
      const newTile = calculateNewTile(currentLocation, direction);

      if (!newTile) {
        await interaction.editReply({
          content: 'Invalid move. The team cannot move in that direction.',
        });
        return;
      }

      const tileData = await databaseHelper.getTileData(newTile);// Fix in moveteam.js (handleButton function)
      const eventMessage = tileData ? generateEventMessage(tileData) : `Your team moved ${direction} to ${newTile}. Looking out on the area you don’t see anything alarming so you set up camp and rest up...`;


      // Update the team's location in the database
      await databaseHelper.updateTeamLocation(teamName, newTile);

      // Update the explored tiles list (ensure no duplicates)
      const updatedExploredTiles = [...new Set([...team.exploredTiles, newTile])];
      await databaseHelper.updateExploredTiles(teamName, updatedExploredTiles);

      // Update the team's current location and explored tiles in the local teamData
      const filteredTeamData = teamData.filter(t => t.teamName === teamName);
      if (filteredTeamData.length > 0) {
        filteredTeamData[0].currentLocation = newTile;  // Update current location
        filteredTeamData[0].exploredTiles = updatedExploredTiles;  // Update explored tiles
      }

      // Now generate the map image for the selected team only
      const mapImagePath = await generateMapImage(filteredTeamData, false);  // Pass false to show only this team's tiles

      const channelId = await databaseHelper.getTeamChannelId(teamName);

      if (!channelId) {
        await interaction.editReply({
          content: 'Failed to find the team’s channel. Please contact the event organizer.',
        });
        return;
      }

      const channel = await interaction.client.channels.fetch(channelId);

      if (channel) {
        await channel.send(eventMessage);
        await channel.send({ files: [mapImagePath] });
      }

      await interaction.editReply({
        content: `Team ${teamName} moved ${direction} to ${newTile}. The update has been posted to the team's channel.`,
      });

    } catch (error) {
      console.error(`Error moving team ${teamName}:`, error);
      if (!interaction.replied) {
        await interaction.editReply({
          content: 'Failed to move the team. Please try again later.',
        });
      }
    }
  }

};
