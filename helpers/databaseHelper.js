// databaseHelper.js

const mysql = require('mysql2/promise');
const tiles = require('../config/tiles');
const { logger } = require('../helpers/logger');

// Setup MySQL connection using environment variables
async function getDBConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,  // Host from environment variables
    user: process.env.DB_USER,  // Username from environment variables
    password: process.env.DB_PASSWORD,  // Password from environment variables
    database: process.env.DB_NAME  // Database name from environment variables
  });
}

// Function to fetch team data from the database
async function getTeamData() {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute('SELECT * FROM teams');

    return rows.map(row => ({
      teamName: row.team_name,
      currentLocation: row.location,
      exploredTiles: row.explored_tiles ? row.explored_tiles.split(',') : [],
      channelId: row.channel_id  // Ensure your table has this field
    }));
  } catch (error) {
    logger('Error fetching team data from database:', error);
    throw error;
  }
}

// Fetch team channel ID from the database
async function getTeamChannelId(teamName) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute('SELECT channel_id FROM teams WHERE team_name = ?', [teamName]);

    if (rows.length === 0) {
      return null; // No channel ID found for the team
    }

    return rows[0].channel_id;
  } catch (error) {
    logger('Error fetching team channel ID from database:', error);
    throw error;
  }
}

// Function to update the team's current location in the database
async function updateTeamLocation(teamName, newLocation) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'UPDATE teams SET location = ? WHERE team_name = ?', 
      [newLocation, teamName]
    );
  } catch (error) {
    logger('Error updating team location in the database:', error);
    throw error;
  }
}

// Function to update the explored tiles for a team in the database
async function updateExploredTiles(teamName, newTiles) {
  try {
    const connection = await getDBConnection();
    const newTilesString = newTiles.join(',');  // Ensure it's a comma-separated string
    await connection.execute(
      'UPDATE teams SET explored_tiles = ? WHERE team_name = ?',
      [newTilesString, teamName]
    );
  } catch (error) {
    logger('Error updating explored tiles in the database:', error);
    throw error;
  }
}

// Function to fetch tile data from tiles.js
function getTileData(tileName) {
  logger(`Fetching data for tile: ${tileName}`);  // Log the tile being fetched
  const tileData = tiles[tileName];  // Access the tile directly
  if (!tileData) {
    logger(`No data found for tile ${tileName}`);
    return null;  // Return null if tile does not exist
  }
  return tileData;
}

// Function to update the team's status (e.g., movement restriction)
async function updateTeamStatus(teamName, status) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'UPDATE teams SET status = CONCAT(status, ?, ?) WHERE team_name = ?',
      [',', status, teamName]
    );
  } catch (error) {
    logger('Error updating team status in the database:', error);
    throw error;
  }
}

// Export functions for use in bot.js
module.exports = {
  getTeamData,
  getTeamChannelId,
  updateTeamLocation,
  updateExploredTiles,
  getTileData,
  updateTeamStatus
};
