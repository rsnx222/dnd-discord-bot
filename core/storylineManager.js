// storylineManager.js

const storylineData = require('../config/events.js'); // Assuming you store event details in this file

function generateStoryline(tileData) {
  const templates = {
    "Puzzle": "As the fog clears, a puzzle emerges: [description]. Your team better think quick to solve the puzzle...",
    "Battle": "You pass into the new area, and face a challenge. [description]. Prepare for a fight!",
  };

  const template = templates[tileData.event] || "You have encountered something new: [description].";
  return template.replace("[description]", tileData.description);
}

module.exports = {
  generateStoryline
};
