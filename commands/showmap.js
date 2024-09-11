// showmap.js

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateMapImage } = require('../mapGenerator');
const settings = require('../settings');
const googleSheetsHelper = require('../googleSheetsHelper');
const teamManager = require('../teamManager');

module.exports = {
  name: 'showmap',
  description: 'Show the current map with team locations',
  options: [
    {
      name: 'team',
      description: 'Optional: Select a team to view only their explored/unexplored tiles',
      type: 3, // String type
      required: false,
      choices: teamManager.getTeamOptions(),  // Dynamically generate team options from teamManager
    },
  ],
  async execute(interaction) {
    const selectedTeam = interaction.options.getString('team'); // Get the selected team (optional)
    await interaction.deferReply({ ephemeral: true });

    try {
      const range = 'Teams!A2:C';
      const response = await googleSheetsHelper.spreadsheets.values.get({
        spreadsheetId: settings.spreadsheetId,
        range,
      });

      const teamData = response.data.values.map(row => ({
        teamName: row[0],
        currentLocation: row[1],
        exploredTiles: row[2] ? row[2].split(',') : [],
      }));

      let filteredTeamData = teamData;
      let showAllTeams = true;

      if (selectedTeam) {
        // If a team is selected, filter the data to only include that team
        filteredTeamData = teamData.filter(team => team.teamName === selectedTeam);
        showAllTeams = false;  // Set flag to show only the selected team's explored tiles
      }

      // Generate the map image for either all teams (unexplored) or the selected team
      const imagePath = await generateMapImage(filteredTeamData, showAllTeams);
      await interaction.editReply({ files: [imagePath] });
    } catch (error) {
      console.error('Error generating map or fetching data:', error);
      await interaction.editReply({ content: 'Failed to generate the map.' });
    }
  }
};
