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

// **New Functions for Event Progress Table**

// Function to insert a new event progress entry for a team
async function insertNewEventProgress(teamName, eventName, requiredScreenshots = 0, requiredItems = 0) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'INSERT INTO event_progress (team_name, event_name, approved_screenshots, approved_items) VALUES (?, ?, ?, ?)',
      [teamName, eventName, requiredScreenshots, requiredItems]
    );
  } catch (error) {
    logger('Error inserting new event progress into the database:', error);
    throw error;
  }
}

// Function to update approved screenshots for an event
async function updateApprovedScreenshots(teamName, eventName, approvedScreenshots) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'UPDATE event_progress SET approved_screenshots = ? WHERE team_name = ? AND event_name = ?',
      [approvedScreenshots, teamName, eventName]
    );
  } catch (error) {
    logger('Error updating approved screenshots in the database:', error);
    throw error;
  }
}

// Function to update approved items for an event
async function updateApprovedItems(teamName, eventName, approvedItems) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'UPDATE event_progress SET approved_items = ? WHERE team_name = ? AND event_name = ?',
      [approvedItems, teamName, eventName]
    );
  } catch (error) {
    logger('Error updating approved items in the database:', error);
    throw error;
  }
}

// Function to mark an event as completed
async function markEventAsCompleted(teamName, eventName) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'UPDATE event_progress SET status = "completed" WHERE team_name = ? AND event_name = ?',
      [teamName, eventName]
    );
  } catch (error) {
    logger('Error marking event as completed in the database:', error);
    throw error;
  }
}

// Function to mark an event as forfeited
async function markEventAsForfeited(teamName, eventName) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'UPDATE event_progress SET status = "forfeited" WHERE team_name = ? AND event_name = ?',
      [teamName, eventName]
    );
  } catch (error) {
    logger('Error marking event as forfeited in the database:', error);
    throw error;
  }
}

// Function to get the current location of a team from the database
async function getTeamLocation(teamName) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute('SELECT location FROM teams WHERE team_name = ?', [teamName]);

    if (rows.length === 0) {
      return null; // No location found for the team
    }

    return rows[0].location;
  } catch (error) {
    logger('Error fetching team location from the database:', error);
    throw error;
  }
}

module.exports = {
  getTeamData,
  getTeamChannelId,
  getTeamLocation,  // Add the new function here
  updateTeamLocation,
  updateExploredTiles,
  updateTeamStatus,
  insertNewEventProgress,
  updateApprovedScreenshots,
  updateApprovedItems,
  markEventAsCompleted,
  markEventAsForfeited
};
