// getTeams.js

const { teamEmojis } = require('../config/settings');
const databaseHelper = require('./databaseHelper'); // Import database helper if needed

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
