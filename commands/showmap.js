const { handleError } = require('../helpers/errorHandler');

// showmap.js

const { SlashCommandBuilder } = require('discord.js');
const { generateMapImage } = require('../helpers/mapGenerator');
const databaseHelper = require('../helpers/databaseHelper');
const teamManager = require('../helpers/teamManager');
const { checkUserPermissions } = require('../helpers/roleChecks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('showmap')
    .setDescription('Show the current map with team locations')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Optional: Select a team to view only their explored/unexplored tiles')
        .setRequired(false)
        .addChoices(...teamManager.getTeamOptions())),  // Dynamically generate team options from teamManager

  async execute(interaction) {
    // Check if the user is an helper
    if (!checkUserPermissions(interaction.member, 'helper')) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const selectedTeam = interaction.options.getString('team'); // Get the selected team (optional)
    await interaction.deferReply({ ephemeral: true });

    try {
      // Use the helper method to get team data from the database
      const teamData = await databaseHelper.getTeamData();

      let filteredTeamData = teamData;
      let showAllTeams = true;

      if (selectedTeam) {
        // If a team is selected, filter the data to only include that team
        filteredTeamData = teamData.filter(team => team.teamName === selectedTeam); // Adjust DB column names if necessary
        showAllTeams = false;  // Set flag to show only the selected team's explored tiles
      }

      // Generate the map image for either all teams (unexplored) or the selected team
      const imagePath = await generateMapImage(filteredTeamData, showAllTeams);
      await interaction.editReply({ files: [imagePath] });
    } catch (error) {
      handleError('Error generating map or fetching data:', error);
      await interaction.editReply({ content: 'Failed to generate the map.' });
    }
  }
};
