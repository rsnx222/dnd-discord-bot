// helpers/getTeamNameFromInteraction.js

const { getTeamData } = require('./databaseHelper');

async function getTeamNameFromInteraction(interaction) {
  const channelId = interaction.channelId;
  const teams = await getTeamData();
  const team = teams.find(t => t.channelId === channelId);
  return team ? team.teamName : null;
}

module.exports = {
  getTeamNameFromInteraction,
};
