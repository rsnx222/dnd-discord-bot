// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper'); // Use the new database helper
const { calculateNewTile } = require('../core/movementLogic'); // Import the movement logic
const { generateEventMessage } = require('../core/storylineManager'); // Import the message generator

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction'),

  async execute(interaction) {
    try {
      // Fetch team data from the database
      const teamData = await databaseHelper.getTeamData();

      // Generate team options for the select menu
      const teamSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_team')
        .setPlaceholder('Select a team')
        .addOptions(teamData.map(team => ({
          label: team.teamName,  // Make sure you're using 'teamName' as per database structure
          value: team.teamName,
        }))); 

      const row = new ActionRowBuilder().addComponents(teamSelectMenu);

      await interaction.reply({
        content: 'Select a team to move:',
        components: [row],
        ephemeral: true,
      });

    } catch (error) {
      console.error('Error generating team select menu:', error);
      await interaction.reply({
        content: 'Failed to load teams. Please try again later.',
        ephemeral: true,
      });
    }
  },

  // Handle team selection from the select menu
  async handleSelectMenu(interaction) {
    if (interaction.customId === 'select_team') {
      const selectedTeam = interaction.values[0]; // Get the selected team

      // Generate buttons for movement directions
      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('north').setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('south').setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('west').setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('east').setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      await interaction.update({
        content: `You selected ${selectedTeam}. Now choose the direction:`,
        components: [directionButtons],
        ephemeral: true,
      });
    }
  },

  // Handle direction button press
  async handleButton(interaction) {
    const direction = interaction.customId; // 'north', 'south', 'east', or 'west'
    const teamName = interaction.message.content.match(/You selected (.+?)\./)[1]; // Extract the team name

    try {
      // Fetch the team's current location from the database
      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === teamName);

      if (!team || !team.currentLocation) {
        throw new Error(`Could not find current location for team ${teamName}`);
      }

      const currentLocation = team.currentLocation; // Now we have the team's current location

      // Calculate the new tile based on the direction
      const newTile = calculateNewTile(currentLocation, direction); 

      if (!newTile) {
        await interaction.update({ content: 'Invalid move. The team cannot move in that direction.', components: [] });
        return;
      }

      // Fetch the new tile data from the database
      const tileData = await databaseHelper.getTileData(newTile);

      if (!tileData) {
        await interaction.update({
          content: `No data found for tile ${newTile}. Please try again later.`,
          components: [],
          ephemeral: true,
        });
        return;
      }

      // Update the team's location in the database
      await databaseHelper.updateTeamLocation(teamName, newTile);

      // Fetch the team's channel ID
      const channelId = await databaseHelper.getTeamChannelId(teamName);

      if (!channelId) {
        await interaction.update({
          content: 'Failed to find the team’s channel. Please contact the event organizer.',
          components: [],
          ephemeral: true,
        });
        return;
      }

      // Send the message to the team’s channel
      const channel = await interaction.client.channels.fetch(channelId);

      if (channel) {
        const eventMessage = generateEventMessage(tileData); // Generate the event message based on tile data
        await channel.send(eventMessage);
      }

      await interaction.update({
        content: `Team ${teamName} moved ${direction} to ${newTile}.`,
        components: [],
        ephemeral: true,
      });
    } catch (error) {
      console.error(`Error moving team ${teamName}:`, error);
      await interaction.update({
        content: 'Failed to move the team. Please try again later.',
        components: [],
        ephemeral: true,
      });
    }
  }
};
