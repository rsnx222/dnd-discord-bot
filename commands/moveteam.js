// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const databaseHelper = require('../databaseHelper'); // Use the new database helper

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
          label: team.team_name,  // Assuming your DB stores team name in 'team_name'
          value: team.team_name,
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
      // Assuming you have a function to calculate the new tile based on direction
      const newTile = calculateNewTile(teamName, direction); // Create this function if necessary
      
      // Update the team's location in the database
      await databaseHelper.updateTeamLocation(teamName, newTile);

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
  },
};