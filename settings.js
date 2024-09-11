// settings.js

require('dotenv').config();

module.exports = {
	guildId: '1242722293700886591',
	DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
	DISCORD_TOKEN: process.env.DISCORD_TOKEN,
	credentialsBase64: process.env.GOOGLE_SHEET_CREDENTIALS_BASE64,
	spreadsheetId: '1GNbfUs3fb2WZ4Zn9rI7kHq7ZwKECOa3psrg7sx2W3oM',
	teamEmojis: {
		Pink: '🩷',
		Green: '🟢',
		Grey: '🔘',
		Blue: '🔵',
		Orange: '🟠',
		Yellow: '🟡',
		Cyan: '🩵',
    },
	MapTileSourceURL: 'https://raw.githubusercontent.com/rsnx222/d-and-d/main/maps/custom-october-2024/',
	MapTileExploredSourceURL: 'https://raw.githubusercontent.com/rsnx222/d-and-d/main/maps/custom-october-2024/explored/',
	MapTileImageType: '.png',
	teamIconBaseURL: 'https://raw.githubusercontent.com/rsnx222/d-and-d/main/icons/players/',
};
