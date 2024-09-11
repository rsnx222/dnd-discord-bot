// teamManager.js

const { teamEmojis } = require('../config/settings');
const databaseHelper = require('../helpers/databaseHelper'); // Import database helper if needed

// Get all team options for select menus
function getTeamOptions() {
  return Object.keys(teamEmojis).map(team => ({
    name: team,
    label: team,
    value: team,
    emoji: teamEmojis[team],
  }));
}

// Get the emoji for a specific team
function getTeamEmoji(teamName) {
  return teamEmojis[teamName] || '🔘';
}

// Export utility functions
module.exports = {
  getTeamOptions,
  getTeamEmoji,
  getTeamChannel, // Export the new function
};
