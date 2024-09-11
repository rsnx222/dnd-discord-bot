// mapGenerator.js

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const settings = require('./settings');

async function generateMapImage(teamData, showAllTeams = true) {
  const tileWidth = 192; // Half of 384px
  const tileHeight = 47.5; // Half of 95px

  // Adjust canvas size based on the new tile dimensions (5 columns, 10 rows)
  const canvas = createCanvas(960, 475); // 5 tiles wide, 10 tiles deep
  const ctx = canvas.getContext('2d');

  // Set the line width for borders to be as thin as possible
  ctx.lineWidth = 0.5;  // Set the thinnest possible border

  // Set the border color
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Light, barely visible border

  // Loop through the valid map grid (5 columns, 10 rows)
  for (let row = 1; row <= 10; row++) { // Row numbers from 1 to 10
    for (let col = 1; col <= 5; col++) { // Column numbers from 1 to 5
      const tile = `${String.fromCharCode(64 + col)}${row}`; // Convert column and row to the tile format, e.g., B3
      const imageName = `image${col}x${row}${settings.MapTileImageType}`; // Image name based on format 'image2x3.png'

      let tileImageURL;

      // For the generic map, only show unexplored tiles
      if (showAllTeams) {
        tileImageURL = `${settings.MapTileSourceURL}${imageName}`; // Always show unexplored tile for the generic map
      } else if (teamData.some(team => team.exploredTiles.includes(tile))) {
        // For individual team view, show explored tiles if applicable
        tileImageURL = `${settings.MapTileExploredSourceURL}${imageName}`; // Show explored tile for individual team
      } else {
        tileImageURL = `${settings.MapTileSourceURL}${imageName}`; // Show unexplored tile if it's not explored
      }

      try {
        const tileImage = await loadImage(tileImageURL);
        ctx.drawImage(tileImage, (col - 1) * tileWidth, (row - 1) * tileHeight, tileWidth, tileHeight); // Draw the tile

        // Draw the border around the tile
        ctx.strokeRect((col - 1) * tileWidth, (row - 1) * tileHeight, tileWidth, tileHeight);  // Thin border for each tile
      } catch (error) {
        console.error(`Error loading image from URL: ${tileImageURL}`, error);
      }
    }
  }

  // Group teams by their current location to handle multiple teams on the same tile
  const teamsGroupedByLocation = teamData.reduce((acc, team) => {
    const { currentLocation } = team;
    if (!acc[currentLocation]) {
      acc[currentLocation] = [];
    }
    acc[currentLocation].push(team);
    return acc;
  }, {});

  // Draw team positions with an offset if multiple teams are on the same tile
  for (const [location, teamsOnSameTile] of Object.entries(teamsGroupedByLocation)) {
    const [baseX, baseY] = getCoordinatesFromTile(location, tileWidth, tileHeight);

    // Calculate icon spacing offsets
    const iconSpacing = 10;  // The distance between icons
    const iconRadius = 16;   // Icon size (width/height = 32px)
    
    const totalTeams = teamsOnSameTile.length;
    const angleStep = (2 * Math.PI) / totalTeams;  // Angle step in radians

    for (let i = 0; i < totalTeams; i++) {
      const team = teamsOnSameTile[i];
      const angle = i * angleStep;  // Calculate the angle for the current team

      // Calculate offset positions using polar coordinates
      const offsetX = Math.cos(angle) * iconSpacing;
      const offsetY = Math.sin(angle) * iconSpacing;

      const iconX = baseX - iconRadius / 2 + offsetX;
      const iconY = baseY - iconRadius / 2 + offsetY;

      // Load team icon based on team name (lowercase) or use default
      const teamIconURL = `${settings.teamIconBaseURL}${team.teamName}.png` || `${settings.teamIconBaseURL}Black.png`;

      try {
        const iconImage = await loadImage(teamIconURL); // Use await to load the image asynchronously
        ctx.drawImage(iconImage, iconX, iconY, 32, 32); // Draw team icon at the calculated location
      } catch (error) {
        console.error(`Error loading team icon: ${teamIconURL}`, error);
      }
    }
  }

  // Save canvas as image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('./map.png', buffer);

  return './map.png';
}

function getCoordinatesFromTile(tile, tileWidth, tileHeight) {
  if (!tile) {
    console.error('Tile is null or undefined.');
    return [0, 0]; // Return default coordinates if tile is invalid
  }

  const gridFormatMatch = tile.match(/([A-Z])(\d+)/);
  if (gridFormatMatch) {
    const colLetter = gridFormatMatch[1]; // Extract the column letter (e.g., "C")
    const row = parseInt(gridFormatMatch[2], 10); // Extract the row number (e.g., 4)

    const col = colLetter.charCodeAt(0) - 'A'.charCodeAt(0) + 1; // Convert the column letter to a number (A=1, B=2, etc.)

    // Convert tile to (x, y) coordinates for the 5x10 grid
    const x = (col - 1) * tileWidth + tileWidth / 2;
    const y = (row - 1) * tileHeight + tileHeight / 2;

    return [x, y];
  }

  console.error(`Invalid tile format: ${tile}`);
  return [0, 0]; // Return default coordinates if tile format is invalid
}

module.exports = {
  generateMapImage,
};
