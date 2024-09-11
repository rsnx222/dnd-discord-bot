// teamManager.js
const teamEmojis = {
  Pink: '🩷',
  Green: '🟢',
  Grey: '🔘',
  Blue: '🔵',
  Orange: '🟠',
  Yellow: '🟡',
  Cyan: '🩵',
};

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
};
