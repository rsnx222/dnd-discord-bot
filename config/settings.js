// settings.js

require('dotenv').config();

module.exports = {
  guildId: '1242722293700886591',
  CLIENT_ID: process.env.CLIENT_ID,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
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
