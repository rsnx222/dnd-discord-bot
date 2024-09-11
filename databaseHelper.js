const mysql = require('mysql2/promise');
const settings = require('./settings');

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
    const [rows] = await connection.execute('SELECT team_name, location, explored_tiles FROM teams');  // Adjust this query as per your database structure

    return rows.map(row => ({
      teamName: row.team_name,
      currentLocation: row.location,
      exploredTiles: row.explored_tiles ? row.explored_tiles.split(',') : []
    }));
  } catch (error) {
    console.error('Error fetching team data from database:', error);
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
    console.error('Error updating team location in the database:', error);
    throw error;
  }
}

// Function to update the explored tiles for a team in the database
async function updateExploredTiles(teamName, newTiles) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'UPDATE teams SET explored_tiles = ? WHERE team_name = ?', 
      [newTiles, teamName]
    );
  } catch (error) {
    console.error('Error updating explored tiles in the database:', error);
    throw error;
  }
}

// Export functions for use in bot.js
module.exports = {
  getTeamData,
  updateTeamLocation,
  updateExploredTiles
};
