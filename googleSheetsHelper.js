// googleSheetsHelper.js
const { google } = require('googleapis');
const settings = require('./settings');

// Setup authentication with Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: settings.credentialsBase64,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Function to fetch team data
async function getTeamData() {
  try {
    const range = 'Teams!A2:C';
    const response = await sheets.spreadsheets.values.get({
      settings.spreadsheetId,
      range,
    });
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
    const teamData = await getTeamData();
    const teamRowIndex = teamData.findIndex(team => team.teamName === teamName) + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
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
  sheets,
};
