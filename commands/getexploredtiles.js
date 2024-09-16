// getexploredtiles.js
const { SlashCommandBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { getTeams } = require('../helpers/getTeams');
const { checkRole } = require('../helpers/checkRole');
const { logger } = require('../helpers/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getexploredtiles')
    .setDescription('Select a team to view their explored tiles in a grid view')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Select a team')
        .setRequired(true)
        .addChoices(...getTeams())
    ),

  async execute(interaction) {
    // Check if the user is a helper
    if (!checkRole(interaction.member, 'helper')) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const selectedTeam = interaction.options.getString('team');
      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === selectedTeam);

      if (!team) {
        return interaction.editReply({ content: 'Team not found.', ephemeral: true });
      }

      const exploredTiles = team.exploredTiles;
      const grid = generateExploredGrid(exploredTiles);

      // Send the grid as a reply
      await interaction.editReply({
        content: `Explored tiles for ${selectedTeam}:\n\`\`\`\n${grid}\n\`\`\``,
        ephemeral: true
      });
      
    } catch (error) {
      logger('Error generating explored tiles grid:', error);
      await interaction.editReply({
        content: 'Failed to load explored tiles. Please try again later.',
        ephemeral: true
      });
    }
  }
};

// Helper function to generate the grid of explored tiles
function generateExploredGrid(exploredTiles) {
  const columns = ['A', 'B', 'C', 'D', 'E'];
  const rows = Array.from({ length: 10 }, (_, i) => i + 1); // 1 to 10

  let grid = '';

  rows.forEach(row => {
    let rowTiles = '';
    columns.forEach(col => {
      const tileName = `${col}${row}`;
      const paddedTileName = row < 10 ? `${col} ${row}` : `${col}${row}`; // Add extra space for rows 1-9
      
      if (exploredTiles.includes(tileName)) {
        rowTiles += `[${paddedTileName}] `; // Explored tile
      } else {
        rowTiles += `${paddedTileName}   `;  // Unexplored tile
      }
    });
    grid += rowTiles.trim() + '\n'; // Append the row to the grid
  });

  return grid.trim();
}
