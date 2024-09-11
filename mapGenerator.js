// mapGenerator.js

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const { MapTileImageType, MapTileSourceURL, MapTileExploredSourceURL } = require('./settings');
const teamManager = require('./teamManager');  // For managing team logic when drawing on the map

async function generateMapImage(teamData, showAllTeams = true) {
  const tileWidth = 192; // Half of 384px
  const tileHeight = 47.5; // Half of 95px
  const borderWidth = 2; // Width of the border between tiles

  // Adjust canvas size based on the new tile dimensions (5 columns, 10 rows) and add space for borders
  const canvas = createCanvas(960 + borderWidth * 5, 475 + borderWidth * 10); // 5 tiles wide, 10 tiles deep, include borders
  const ctx = canvas.getContext('2d');

  // Loop through the valid map grid (5 columns, 10 rows)
  for (let row = 1; row <= 10; row++) { // Row numbers from 1 to 10
    for (let col = 1; col <= 5; col++) { // Column numbers from 1 to 5
      const tile = `${String.fromCharCode(64 + col)}${row}`; // Convert column and row to the tile format, e.g., B3
      const imageName = `image${col}x${row}${MapTileImageType}`; // Image name based on format 'image2x3.png'

      let tileImageURL;

      // For the generic map, only show unexplored tiles
      if (showAllTeams) {
        tileImageURL = `${MapTileSourceURL}${imageName}`; // Always show unexplored tile for the generic map
      } 
      // For individual team view, show explored tiles if applicable
      else if (teamData.some(team => team.exploredTiles.includes(tile))) {
        tileImageURL = `${MapTileExploredSourceURL}${imageName}`; // Show explored tile for individual team
      } 
      else {
        tileImageURL = `${MapTileSourceURL}${imageName}`; // Show unexplored tile if it's not explored
      }

      console.log(`Loading image from URL: ${tileImageURL}`);

      try {
        const tileImage = await loadImage(tileImageURL);
        ctx.drawImage(tileImage, (col - 1) * (tileWidth + borderWidth), (row - 1) * (tileHeight + borderWidth), tileWidth, tileHeight);
      } catch (error) {
        console.error(`Error loading image from URL: ${tileImageURL}`, error);
      }

      // Draw a border around each tile
      ctx.strokeStyle = 'black';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect((col - 1) * (tileWidth + borderWidth), (row - 1) * (tileHeight + borderWidth), tileWidth, tileHeight);
    }
  }

  // Draw team positions with their icons
  for (const team of teamData) {
    const { currentLocation, teamName } = team;
    const [x, y] = getCoordinatesFromTile(currentLocation, tileWidth, tileHeight, borderWidth);

    const teamIconURL = `${teamIconBaseURL}${teamName}.png`; // Use the team's specific icon
    const defaultIconURL = `${teamIconBaseURL}Black.png`; // Fallback to black if no team icon exists

    try {
      const teamIcon = await loadImage(teamIconURL);
      ctx.drawImage(teamIcon, x - 20, y - 20, 40, 40); // Position the icon on the tile, adjust size
    } catch (error) {
      // If loading the team-specific icon fails, use the default Black.png icon
      console.error(`Error loading team icon from URL: ${teamIconURL}, using default icon.`);
      const defaultIcon = await loadImage(defaultIconURL);
      ctx.drawImage(defaultIcon, x - 20, y - 20, 40, 40);
    }
  }

  // Save canvas as image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('./map.png', buffer);

  return './map.png';
}

function getCoordinatesFromTile(tile, tileWidth, tileHeight, borderWidth) {
  if (!tile) {
    console.error('Tile is null or undefined.');
    return [0, 0]; // Return default coordinates if tile is invalid
  }

  const gridFormatMatch = tile.match(/([A-Z])(\d+)/);
  if (gridFormatMatch) {
    const colLetter = gridFormatMatch[1]; // Extract the column letter (e.g., "C")
    const row = parseInt(gridFormatMatch[2], 10); // Extract the row number (e.g., 4)

    const col = colLetter.charCodeAt(0) - 'A'.charCodeAt(0) + 1; // Convert the column letter to a number (A=1, B=2, etc.)

    // Convert tile to (x, y) coordinates for the 5x10 grid, including borders
    const x = (col - 1) * (tileWidth + borderWidth) + tileWidth / 2;
    const y = (row - 1) * (tileHeight + borderWidth) + tileHeight / 2;

    return [x, y];
  }

  console.error(`Invalid tile format: ${tile}`);
  return [0, 0]; // Return default coordinates if tile format is invalid
}

module.exports = {
  generateMapImage
};
