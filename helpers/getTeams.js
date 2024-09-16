// getTeams.js

const { teamEmojis } = require('../config/settings');

// Get all team options for select menus
function getTeams() {
  return Object.keys(teamEmojis).map(team => ({
    name: team,
    label: team,
    value: team,
    emoji: teamEmojis[team],
  }));
}

// Export utility functions
module.exports = {
  getTeams,
};
