// googleSheetsHelper.js
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Your setup for Google Sheets
const credentialsBase64 = process.env.GOOGLE_SHEET_CREDENTIALS_BASE64;
const credentialsPath = path.join(__dirname, 'credentials.json');
fs.writeFileSync(credentialsPath, Buffer.from(credentialsBase64, 'base64'));

const auth = new GoogleAuth({
  keyFile: credentialsPath,
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = '1GNbfUs3fb2WZ4Zn9rI7kHq7ZwKECOa3psrg7sx2W3oM';

// Function to fetch team data
async function getTeamData() {
  try {
    const range = 'Teams!A2:C';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
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
};
