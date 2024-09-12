// getexploredtiles.js

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const teamManager = require('../helpers/teamManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getexploredtiles')
    .setDescription('Select a team to view their explored tiles in a grid view')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Select a team')
        .setRequired(true)
        .addChoices(...teamManager.getTeamOptions())
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const selectedTeam = interaction.options.getString('team');
      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === selectedTeam);

      if (!team) {
        return interaction.editReply({ content: 'Team not found.', ephemeral: true });
      }

      const exploredTiles = team.exploredTiles;
      
      // Define the grid (5x10) for example (A1 to E10)
      const columns = ['A', 'B', 'C', 'D', 'E'];
      const rows = [...Array(10).keys()].map(i => i + 1); // 1 to 10

      let grid = '';

      // Build the grid with rectangular tiles (represented as text)
      for (let row of rows) {
        let rowTiles = '';
        for (let col of columns) {
          const tileName = `${col}${row}`;
          if (exploredTiles.includes(tileName)) {
            // Explored tile -> highlight with []
            rowTiles += `[${tileName}] `;
          } else {
            // Unexplored tile
            rowTiles += `${tileName}   `;
          }
        }
        grid += rowTiles.trim() + '\n'; // Append the row to the grid
      }

      // Send the grid as a reply
      await interaction.editReply({
        content: `Explored tiles for ${selectedTeam}:\n\`\`\`\n${grid}\n\`\`\``,
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Error generating explored tiles grid:', error);
      await interaction.editReply({
        content: 'Failed to load explored tiles. Please try again later.',
        ephemeral: true
      });
    }
  }
};
