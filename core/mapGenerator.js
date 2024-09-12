// mapGenerator.js

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const settings = require('../config/settings');

async function generateMapImage(teamData, showAllTeams = true) {
  const tileWidth = 192; // Half of 384px
  const tileHeight = 47.5; // Half of 95px

  // Adjust canvas size based on the new tile dimensions (5 columns, 10 rows)
  const canvas = createCanvas(960, 475); // 5 tiles wide, 10 tiles deep
  const ctx = canvas.getContext('2d');

  // Set the line width for borders to be as thin as possible
  ctx.lineWidth = 0.5;  // Set the thinnest possible border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Light, barely visible border

  // Loop through the valid map grid (5 columns, 10 rows)
  for (let row = 1; row <= 10; row++) { 
    for (let col = 1; col <= 5; col++) { 
      const tile = `${String.fromCharCode(64 + col)}${row}`; 
      const imageName = `image${col}x${row}${settings.MapTileImageType}`;

      let tileImageURL;

      if (showAllTeams) {
        tileImageURL = `${settings.MapTileSourceURL}${imageName}`;
      } else if (teamData.some(team => team.exploredTiles.includes(tile))) {
        tileImageURL = `${settings.MapTileExploredSourceURL}${imageName}`;
      } else {
        tileImageURL = `${settings.MapTileSourceURL}${imageName}`;
      }

      try {
        const tileImage = await loadImage(tileImageURL);
        ctx.drawImage(tileImage, (col - 1) * tileWidth, (row - 1) * tileHeight, tileWidth, tileHeight);
        ctx.strokeRect((col - 1) * tileWidth, (row - 1) * tileHeight, tileWidth, tileHeight);
      } catch (error) {
        console.error(`Error loading image from URL: ${tileImageURL}`, error);
      }
    }
  }

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

    console.log(`Rendering teams at ${location}: X=${baseX}, Y=${baseY}`); // Add logging to debug

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

      console.log(`Placing icon for team ${team.teamName} at X=${iconX}, Y=${iconY}`); // Add logging to debug

      try {
        const iconImage = await loadImage(teamIconURL);
        ctx.drawImage(iconImage, iconX, iconY, 32, 32);
      } catch (error) {
        console.error(`Error loading team icon: ${teamIconURL}, using default icon instead`);

        // Use default icon if specific team icon is not found
        const defaultIconURL = `${settings.teamIconBaseURL}Black.png`;
        try {
          const defaultIcon = await loadImage(defaultIconURL);
          ctx.drawImage(defaultIcon, iconX, iconY, 32, 32);
        } catch (defaultIconError) {
          console.error(`Error loading default icon: ${defaultIconURL}`, defaultIconError);
        }
      }
    }
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('./map.png', buffer);

  return './map.png';
}

function getCoordinatesFromTile(tile, tileWidth, tileHeight) {
  if (!tile) {
    console.error('Tile is null or undefined.');
    return [0, 0];
  }

  const gridFormatMatch = tile.match(/([A-Z])(\d+)/);
  if (gridFormatMatch) {
    const colLetter = gridFormatMatch[1];
    const row = parseInt(gridFormatMatch[2], 10);

    const col = colLetter.charCodeAt(0) - 'A'.charCodeAt(0) + 1;

    const x = (col - 1) * tileWidth + tileWidth / 2;
    const y = (row - 1) * tileHeight + tileHeight / 2;

    console.log(`Converting tile ${tile} to X=${x}, Y=${y}`); // Add logging to debug

    return [x, y];
  }

  console.error(`Invalid tile format: ${tile}`);
  return [0, 0];
}

module.exports = {
  generateMapImage,
};
