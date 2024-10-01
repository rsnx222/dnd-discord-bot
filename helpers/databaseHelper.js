// databaseHelper.js

const mysql = require('mysql2/promise');
const tiles = require('../config/tiles');
const { logger } = require('../helpers/logger');

// Setup MySQL connection using environment variables
async function getDBConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,      // Host from environment variables
    user: process.env.DB_USER,      // Username from environment variables
    password: process.env.DB_PASSWORD,  // Password from environment variables
    database: process.env.DB_NAME    // Database name from environment variables
  });
}

// Function to fetch specific team data from the database
async function getTeamData(teamName) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute('SELECT * FROM teams WHERE team_name = ?', [teamName]);

    if (rows.length === 0) {
      return null; // No team data found
    }

    const row = rows[0];

    // Ensure values are not undefined; use null if necessary
    return {
      teamName: row.team_name || null,
      currentLocation: row.location || null,
      exploredTiles: row.explored_tiles ? row.explored_tiles.split(',') : [],
      channelId: row.channel_id || null // Use null if channelId is undefined
    };
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

// Function to get event progress status (completed/in_progress/forfeited)
async function getEventProgressStatus(teamName, tile) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute(
      'SELECT status, event_name FROM event_progress WHERE team_name = ? AND event_name LIKE ?',
      [teamName, `${tile}%`] // This fetches all events on the tile
    );
    return rows; // Return all event statuses on the tile
  } catch (error) {
    logger('Error fetching event progress status from the database:', error);
    throw error;
  }
}

// Insert new event progress with status 'in_progress'
async function insertNewEventProgress(teamName, tile, events) {
  try {
    const connection = await getDBConnection();
    for (let i = 0; i < events.length; i++) {
      const eventName = `${tile}_${i}`; // Example format: C6_0, C6_1, etc.
      await connection.execute(
        'INSERT INTO event_progress (team_name, event_name, approved_screenshots, approved_items, status) VALUES (?, ?, ?, ?, "in_progress")',
        [teamName, eventName, 0, 0]
      );
    }
  } catch (error) {
    logger('Error inserting new event progress into the database:', error);
    throw error;
  }
}

// Function to update approved screenshots for an event
async function updateApprovedScreenshots(teamName, tile, eventIndex, approvedScreenshots) {
  try {
    const connection = await getDBConnection();
    const eventName = `${tile}_${eventIndex}`;

    // Ensure all parameters are valid, and replace undefined with null
    const params = [
      approvedScreenshots !== undefined ? approvedScreenshots : null,
      teamName !== undefined ? teamName : null,
      eventName !== undefined ? eventName : null
    ];

    await connection.execute(
      'UPDATE event_progress SET approved_screenshots = ? WHERE team_name = ? AND event_name = ?',
      params
    );
  } catch (error) {
    logger('Error updating approved screenshots in the database:', error);
    throw error;
  }
}


// Function to update approved items for an event
async function updateApprovedItems(teamName, tile, eventIndex, approvedItems) {
  try {
    const connection = await getDBConnection();
    const eventName = `${tile}_${eventIndex}`;
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

// Function to get approved screenshots for an event
async function getApprovedScreenshots(teamName, eventName) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute(
      'SELECT approved_screenshots FROM event_progress WHERE team_name = ? AND event_name = ?',
      [teamName, eventName]
    );

    if (rows.length === 0) {
      return 0;  // No screenshots approved yet
    }

    return rows[0].approved_screenshots;
  } catch (error) {
    logger('Error fetching approved screenshots from the database:', error);
    throw error;
  }
}

// Function to get approved items for an event
async function getApprovedItems(teamName, eventName) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute(
      'SELECT approved_items FROM event_progress WHERE team_name = ? AND event_name = ?',
      [teamName, eventName]
    );

    if (rows.length === 0) {
      return 0; // No event found, assume 0 approved items
    }

    return rows[0].approved_items;
  } catch (error) {
    logger('Error fetching approved items from the database:', error);
    throw error;
  }
}

// Function to check if a screenshot has already been processed
async function isScreenshotProcessed(teamName, eventName, messageId) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute(
      'SELECT status FROM processed_screenshots WHERE team_name = ? AND event_name = ? AND message_id = ?',
      [teamName, eventName, messageId]
    );
    return rows.length > 0; // Returns true if the screenshot has been processed
  } catch (error) {
    logger('Error checking if screenshot has been processed:', error);
    throw error;
  }
}

// Function to mark a screenshot as processed
async function markScreenshotAsProcessed(teamName, eventName, messageId, status) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'INSERT INTO processed_screenshots (team_name, event_name, message_id, status) VALUES (?, ?, ?, ?)',
      [teamName, eventName, messageId, status]
    );
  } catch (error) {
    logger('Error marking screenshot as processed:', error);
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

// Functions to manage team rewards and penalties
// Create the 'team_rewards_penalties' table in your database with appropriate fields

// Function to add a reward or penalty to a team
async function addTeamRewardPenalty(teamName, type, itemName, description) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'INSERT INTO team_rewards_penalties (team_name, type, item_name, description) VALUES (?, ?, ?, ?)',
      [teamName, type, itemName, description]
    );
  } catch (error) {
    logger('Error adding team reward/penalty:', error);
    throw error;
  }
}

// Function to remove a reward or penalty from a team
async function removeTeamRewardPenalty(teamName, itemName) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'DELETE FROM team_rewards_penalties WHERE team_name = ? AND item_name = ? LIMIT 1',
      [teamName, itemName]
    );
  } catch (error) {
    logger('Error removing team reward/penalty:', error);
    throw error;
  }
}

// Function to get all rewards and penalties for a team
async function getTeamRewardsPenalties(teamName) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM team_rewards_penalties WHERE team_name = ?',
      [teamName]
    );
    return rows;
  } catch (error) {
    logger('Error fetching team rewards and penalties:', error);
    throw error;
  }
}

// Function to get tasks for a team
async function getTeamTasks(teamName) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM tasks WHERE team_name = ? AND status != "completed"',
      [teamName]
    );
    return rows;
  } catch (error) {
    logger('Error fetching team tasks:', error);
    throw error;
  }
}

// Function to mark a task as completed
async function markTaskAsCompleted(teamName, taskId) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'UPDATE tasks SET status = "completed" WHERE id = ? AND team_name = ?',
      [taskId, teamName]
    );
  } catch (error) {
    logger('Error marking task as completed:', error);
    throw error;
  }
}

// Function to reset event progress for a team
async function resetEventProgress(teamName) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'DELETE FROM event_progress WHERE team_name = ?',
      [teamName]
    );
    logger(`Event progress reset for team ${teamName}.`);
  } catch (error) {
    logger('Error resetting event progress:', error);
    throw error;
  }
}

// Function to reset processed screenshots for a team
async function resetProcessedScreenshots(teamName) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'DELETE FROM processed_screenshots WHERE team_name = ?',
      [teamName]
    );
    logger(`Processed screenshots reset for team ${teamName}.`);
  } catch (error) {
    logger('Error resetting processed screenshots:', error);
    throw error;
  }
}

// Function to reset rewards and penalties for a team
async function resetTeamRewardsPenalties(teamName) {
  try {
    const connection = await getDBConnection();
    await connection.execute(
      'DELETE FROM team_rewards_penalties WHERE team_name = ?',
      [teamName]
    );
    logger(`Rewards and penalties reset for team ${teamName}.`);
  } catch (error) {
    logger('Error resetting team rewards and penalties:', error);
    throw error;
  }
}

module.exports = {
  getTeamData,
  getTeamChannelId,
  getTeamLocation,
  updateTeamLocation,
  updateExploredTiles,
  getEventProgressStatus,
  insertNewEventProgress,
  updateApprovedScreenshots,
  updateApprovedItems,
  markEventAsCompleted,
  markEventAsForfeited,
  getApprovedScreenshots,
  getApprovedItems,
  isScreenshotProcessed,
  markScreenshotAsProcessed,
  addTeamRewardPenalty,
  removeTeamRewardPenalty,
  getTeamRewardsPenalties,
  getTeamTasks,
  markTaskAsCompleted,
  resetEventProgress,
  resetProcessedScreenshots,
  resetTeamRewardsPenalties,
};
