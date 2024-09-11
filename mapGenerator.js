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

  // Set the border color (if you want to change it)
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

      console.log(`Loading image from URL: ${tileImageURL}`);

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

  // Draw team positions with team-specific colors
  for (const team of teamData) {
    const { currentLocation, teamName } = team;
    const [x, y] = getCoordinatesFromTile(currentLocation, tileWidth, tileHeight);

    // Load team icon based on team name (lowercase) or use default
    const teamIconURL = `${settings.teamIconBaseURL}${teamName}.png` || `${settings.teamIconBaseURL}Black.png`;

    try {
      const iconImage = await loadImage(teamIconURL); // Use await to load the image asynchronously
      ctx.drawImage(iconImage, x - 16, y - 16, 32, 32); // Draw team icon at current location
    } catch (error) {
      console.error(`Error loading team icon: ${teamIconURL}`, error);
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
