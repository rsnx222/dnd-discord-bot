// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { calculateNewTile } = require('../helpers/movementLogic');
const { getTeams } = require('../helpers/getTeams');
const { sendMapAndEvent } = require('../helpers/sendMapAndEvent');
const { handleCompleteTask } = require('../helpers/taskHandler');
const { logger } = require('../helpers/logger');
const { checkRole } = require('../helpers/checkRole');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Select a team to move')
        .setRequired(true)
        .addChoices(...getTeams())
    ),

  async execute(interaction) {
    if (!checkRole(interaction.member, 'admin')) {
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
      logger('Error handling movement options:', error, interaction);
      await interaction.editReply({ content: 'Failed to handle the command. Please try again later.' });
    }
  },

  async handleButton(interaction) {
    const selectedTeam = interaction.customId.split('_').pop();
    const action = interaction.customId.split('_')[0];  // Extracts the action (e.g., 'north', 'complete')

    // Check if the interaction has already been replied or deferred
    if (interaction.deferred || interaction.replied) {
        logger('Interaction already deferred or replied.');
        return; // Exit early if the interaction has already been responded to
    }

    if (['north', 'south', 'west', 'east'].includes(action)) {
      // Movement button logic
      try {
        await interaction.deferReply({ ephemeral: true });

        const teamData = await databaseHelper.getTeamData();
        const team = teamData.find(t => t.teamName === selectedTeam);

        if (!team || !team.currentLocation) {
          logger(`Could not find current location for team ${selectedTeam}`, interaction);
          return;  // Return immediately if team data is invalid
        }

        const currentLocation = team.currentLocation;
        const newTile = calculateNewTile(currentLocation, action);

        if (!newTile) {
          return interaction.editReply({
            content: 'Invalid move. The team cannot move in that direction.',
          });
        }

        // Update team's location and explored tiles
        await databaseHelper.updateTeamLocation(selectedTeam, newTile);
        const updatedExploredTiles = [...new Set([...team.exploredTiles, newTile])];
        await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

        // Get team channel and send map and event
        const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
        const channel = await interaction.client.channels.fetch(channelId);
        if (channel) {
          // Start with the first event
          logger(`Sending map and event for team ${selectedTeam} at ${newTile}`);
          await sendMapAndEvent(selectedTeam, newTile, interaction, channel, 0, false); // Start event at index 0
        }

        await interaction.editReply({
          content: `Team ${selectedTeam} moved to ${newTile}.`,
        });

      } catch (error) {
        logger(`Error moving team ${selectedTeam}:`, error, interaction);
        if (!interaction.replied) {
          await interaction.editReply({
            content: 'Failed to move the team. Please try again later.',
          });
        }
      }
    } else if (action === 'complete') {
      // Task completion logic
      try {
        if (!checkRole(interaction.member, 'helper')) {
          return interaction.reply({ content: 'You do not have permission to complete this task.', ephemeral: true });
        }

        const teamData = await databaseHelper.getTeamData();
        const team = teamData.find(t => t.teamName === selectedTeam);

        if (!team || !team.currentLocation) {
          logger(`Could not find current location for team ${selectedTeam}`);
          return;  // Return immediately if team data is invalid
        }

        const currentTile = team.currentLocation;
        const tileData = await databaseHelper.getTileData(currentTile);
        
        // Call the task completion logic from eventManager (handleCompleteTask was correct)
        await handleCompleteTask(interaction, selectedTeam, tileData, 0);  // Assuming eventIndex is 0

        await interaction.editReply({
          content: `Task completed for team ${selectedTeam}.`,
          ephemeral: true,
        });
      } catch (error) {
        logger(`Error completing task for team ${selectedTeam}:`, error, interaction);
        if (!interaction.replied) {
          await interaction.editReply({
            content: 'Failed to complete the task. Please try again later.',
            ephemeral: true,
          });
        }
      }
    }
  }
};
