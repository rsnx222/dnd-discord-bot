// googleSheetsHelper.js

const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path'); // Add the missing path module
const settings = require('./settings');

// Setup authentication with Google Sheets API
const credentialsPath = path.join(__dirname, 'credentials.json');
fs.writeFileSync(credentialsPath, Buffer.from(settings.credentialsBase64, 'base64')); // Save credentials to a file

const auth = new GoogleAuth({
  keyFile: credentialsPath,
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

// Create the sheets client after authentication
async function getSheetsClient() {
  const authClient = await auth.getClient();  // Ensure the authentication client is initialized
  return google.sheets({ version: 'v4', auth: authClient });
}

// Function to fetch team data
async function getTeamData() {
  try {
    const sheets = await getSheetsClient();  // Ensure the sheets client is initialized with the proper auth
    const range = 'Teams!A2:C';
    const spreadsheetId = settings.spreadsheetId;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    // Check if the response contains the data and values
    if (!response.data || !response.data.values) {
      throw new Error('No data returned from Google Sheets');
    }

    return response.data.values.map(row => ({
      teamName: row[0],
      currentLocation: row[1],
      exploredTiles: row[2] ? row[2].split(',') : []
    }));
  } catch (error) {
    console.error('Error fetching team data:', error);
    throw error;
  }
}

// Function to update the team's current location
async function updateTeamLocation(teamName, newLocation) {
  try {
    const sheets = await getSheetsClient();  // Ensure the sheets client is initialized with the proper auth
    const teamData = await getTeamData();
    const teamRowIndex = teamData.findIndex(team => team.teamName === teamName) + 2;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: settings.spreadsheetId,
      range: `Teams!B${teamRowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[newLocation]],
      },
    });
  } catch (error) {
    console.error('Error updating team location:', error);
    throw error;
  }
}

// Export functions for use in bot.js
module.exports = {
  getTeamData,
  updateTeamLocation,
};
