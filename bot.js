const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const credentialsBase64 = process.env.GOOGLE_SHEET_CREDENTIALS_BASE64;
const credentialsPath = path.join(__dirname, 'credentials.json');
fs.writeFileSync(credentialsPath, Buffer.from(credentialsBase64, 'base64'));

const auth = new GoogleAuth({
  keyFile: credentialsPath,
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const sheets = google.sheets({ version: 'v4', auth });

const spreadsheetId = '1GNbfUs3fb2WZ4Zn9rI7kHq7ZwKECOa3psrg7sx2W3oM';

client.on('ready', () => {
  console.log('Bot is online!');
  registerCommands();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'example') {
    const range = 'Teams!A1:D10'; // Adjust this range as needed

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const data = response.data.values;
      const embed = new EmbedBuilder()
        .setTitle('Team Status')
        .setDescription('Here is the current status of the teams.')
        .setColor('#00ff00'); // Choose a color for the embed

      data.forEach(row => {
        const [teamName, currentLocation, exploredTiles, status] = row;
        const emoji = getTeamEmoji(teamName); // Function to get emoji based on team name
        embed.addFields({
          name: `${emoji} ${teamName}`,
          value: `Current Tile: ${currentLocation}\nStatus: ${status}`,
          inline: true,
        });
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      await interaction.reply({ content: 'Failed to fetch data from Google Sheets.', ephemeral: true });
    }
  } else if (commandName === 'moveteam') {
    const member = interaction.member;

    // Check if user has the 'admin' role
    if (!member.roles.cache.some(role => role.name === 'admin')) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    const team = interaction.options.getString('team');
    const direction = interaction.options.getString('direction');
    
    // Handle the /moveteam logic here
    // For example, you could update the team position in your Google Sheet or a database

    await interaction.reply({ content: `Moved team ${team} ${direction}.`, ephemeral: true });
  }
});

client.login(DISCORD_TOKEN);

async function registerCommands() {
  const commands = [
    {
      name: 'example',
      description: 'Fetches and displays team data from Google Sheets.',
    },
    {
      name: 'moveteam',
      description: 'Move a team to a new tile (Admin only).',
      options: [
        {
          type: 3, // STRING
          name: 'team',
          description: 'The team to move.',
          required: true,
        },
        {
          type: 3, // STRING
          name: 'direction',
          description: 'The direction to move the team (e.g., up, down, left, right).',
          required: true,
        },
      ],
    },
  ];

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

function getTeamEmoji(teamName) {
  // Return emoji based on team name, adjust as necessary
  const emojis = {
    'Red': '🔴',
    'Blue': '🔵',
    'Green': '🟢',
    'Yellow': '🟡',
  };
  return emojis[teamName] || '🔘';
}
