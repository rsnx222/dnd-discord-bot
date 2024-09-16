// mapGenerator.js

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const settings = require('../config/settings');
const { handleError } = require('./handleError');

async function generateMapImage(teamData, showAllTeams = true) {
  const tileWidth = 192; // Half of 384px
  const tileHeight = 47.5; // Half of 95px

  // Adjust canvas size based on the new tile dimensions (5 columns, 10 rows)
  const canvas = createCanvas(960, 475); // 5 tiles wide, 10 tiles deep
  const ctx = canvas.getContext('2d');

  // Set the line width for borders to be as thin as possible
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Light, barely visible border

  // Preload default icon for fallback
  let defaultIcon;
  try {
    defaultIcon = await loadImage(`${settings.teamIconBaseURL}Black.png`);
  } catch (error) {
    handleError('Error loading default icon.', null, error);
  }

  // Loop through the valid map grid (5 columns, 10 rows)
  for (let row = 1; row <= 10; row++) {
    for (let col = 1; col <= 5; col++) {
      const tile = `${String.fromCharCode(64 + col)}${row}`;
      const imageName = `image${col}x${row}${settings.MapTileImageType}`;

      let tileImageURL;
      if (showAllTeams || teamData.length === 0 || teamData.some(team => team.exploredTiles.includes(tile))) {
        // Show explored tiles for all teams or specific teams
        tileImageURL = `${settings.MapTileExploredSourceURL}${imageName}`;
      } else {
        tileImageURL = `${settings.MapTileSourceURL}${imageName}`;
      }

      try {
        const tileImage = await loadImage(tileImageURL);
        ctx.drawImage(tileImage, (col - 1) * tileWidth, (row - 1) * tileHeight, tileWidth, tileHeight);
        ctx.strokeRect((col - 1) * tileWidth, (row - 1) * tileHeight, tileWidth, tileHeight);

        // Apply faint green overlay for specific team maps
        if (!showAllTeams && teamData.some(team => team.exploredTiles.includes(tile))) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';  // Semi-transparent green
          ctx.fillRect((col - 1) * tileWidth, (row - 1) * tileHeight, tileWidth, tileHeight);
        }
      } catch (error) {
        handleError(`Error loading tile image from URL: ${tileImageURL}`, null, error);
      }
    }
  }

  // Place team icons if showing team locations
  const teamsGroupedByLocation = teamData.reduce((acc, team) => {
    const { currentLocation } = team;
    if (!acc[currentLocation]) {
      acc[currentLocation] = [];
    }
    acc[currentLocation].push(team);
    return acc;
  }, {});

  for (const [location, teamsOnSameTile] of Object.entries(teamsGroupedByLocation)) {
    const [baseX, baseY] = getCoordinatesFromTile(location, tileWidth, tileHeight);

    const iconSpacing = 10;
    const iconRadius = 16;
    const totalTeams = teamsOnSameTile.length;
    const angleStep = (2 * Math.PI) / totalTeams;

    for (let i = 0; i < totalTeams; i++) {
      const team = teamsOnSameTile[i];
      const angle = i * angleStep;
      const offsetX = Math.cos(angle) * iconSpacing;
      const offsetY = Math.sin(angle) * iconSpacing;
      const iconX = baseX - iconRadius / 2 + offsetX;
      const iconY = baseY - iconRadius / 2 + offsetY;

      const teamIconURL = `${settings.teamIconBaseURL}${team.teamName}.png`;

      try {
        const iconImage = await loadImage(teamIconURL);
        ctx.drawImage(iconImage, iconX, iconY, 32, 32);
      } catch (error) {
        handleError(`Error loading team icon: ${teamIconURL}, using default icon instead.`, null, error);
        if (defaultIcon) {
          ctx.drawImage(defaultIcon, iconX, iconY, 32, 32);
        }
      }
    }
  }

  // Generate a dynamic filename for the map
  const outputPath = `./maps/map_${Date.now()}.png`;
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

function getCoordinatesFromTile(tile, tileWidth, tileHeight) {
  if (!tile) {
    handleError('Tile is null or undefined.');
    return [0, 0];
  }

  const gridFormatMatch = tile.match(/([A-Z])(\d+)/);
  if (gridFormatMatch) {
    const colLetter = gridFormatMatch[1];
    const row = parseInt(gridFormatMatch[2], 10);

    const col = colLetter.charCodeAt(0) - 'A'.charCodeAt(0) + 1;

    const x = (col - 1) * tileWidth + tileWidth / 2;
    const y = (row - 1) * tileHeight + tileHeight / 2;

    return [x, y];
  }

  handleError(`Invalid tile format: ${tile}`);
  return [0, 0];
}

module.exports = {
  generateMapImage,
};
