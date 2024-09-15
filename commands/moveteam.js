// moveteam.js

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const databaseHelper = require('../helpers/databaseHelper');
const { calculateNewTile } = require('../core/movementLogic');
const { generateEventMessage } = require('../core/eventManager');
const { generateMapImage } = require('../core/mapGenerator');
const teamManager = require('../helpers/teamManager');
const { isHelper } = require('../helpers/permissionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moveteam')
    .setDescription('Move a team by selecting a direction')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Select a team to move')
        .setRequired(true)
        .addChoices(...teamManager.getTeamOptions())
    ),

  async execute(interaction) {
    if (!isHelper(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const selectedTeam = interaction.options.getString('team');

      // Present direction buttons for the selected team
      const directionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`north_${selectedTeam}`).setLabel('⬆️ North').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`south_${selectedTeam}`).setLabel('⬇️ South').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`west_${selectedTeam}`).setLabel('⬅️ West').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`east_${selectedTeam}`).setLabel('➡️ East').setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({
        content: `You selected ${selectedTeam}. Choose a direction to move:`,
        components: [directionButtons],
      });
    } catch (error) {
      console.error('Error handling movement options:', error);
      await interaction.editReply({ content: 'Failed to handle the command. Please try again later.' });
    }
  },

  async handleButton(interaction) {
    const selectedTeam = interaction.customId.split('_').pop();  // Extract team name from button ID
    const direction = interaction.customId.split('_')[0];

    try {
      await interaction.deferReply({ ephemeral: true });

      const teamData = await databaseHelper.getTeamData();
      const team = teamData.find(t => t.teamName === selectedTeam);

      if (!team || !team.currentLocation) {
        throw new Error(`Could not find current location for team ${selectedTeam}`);
      }

      const currentLocation = team.currentLocation;
      const newTile = calculateNewTile(currentLocation, direction);

      if (!newTile) {
        return interaction.editReply({
          content: 'Invalid move. The team cannot move in that direction.',
        });
      }

      // **Ensure team data is updated first, then generate map**
      await databaseHelper.updateTeamLocation(selectedTeam, newTile);
      const updatedExploredTiles = [...new Set([...team.exploredTiles, newTile])];
      await databaseHelper.updateExploredTiles(selectedTeam, updatedExploredTiles);

      const teamDataUpdated = await databaseHelper.getTeamData();  // Get the updated team data
      const filteredTeamData = teamDataUpdated.filter(t => t.teamName === selectedTeam);

      // **Generate the map after the team has moved and explored tiles are updated**
      const mapImagePath = await generateMapImage(filteredTeamData, false);  // Generate map after data update
      const tileData = await databaseHelper.getTileData(newTile);

      const eventMessage = generateEventMessage(tileData);
      const channelId = await databaseHelper.getTeamChannelId(selectedTeam);
      const channel = await interaction.client.channels.fetch(channelId);

      if (channel) {
        // Send the map to the team's channel, regardless of whether there's an event
        await channel.send({ files: [mapImagePath] });

        // If there's an event, display event details in an embed with relevant options
        if (tileData && tileData.event_type) {
          const eventEmbed = new EmbedBuilder()
            .setTitle(`Event: ${tileData.event_type}`)
            .setDescription(tileData.description || 'An event awaits...')
            .setColor('Random');

          // Event-specific buttons
          let eventButtons;
          switch (tileData.event_type.toLowerCase()) {
            case 'boss':
              eventButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`complete_boss_${selectedTeam}`).setLabel('Mark Boss as Complete').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`forfeit_boss_${selectedTeam}`).setLabel('Forfeit Boss').setStyle(ButtonStyle.Danger)
              );
              break;
            case 'challenge':
              eventButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`complete_challenge_${selectedTeam}`).setLabel('Complete Challenge').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`forfeit_challenge_${selectedTeam}`).setLabel('Forfeit Challenge').setStyle(ButtonStyle.Danger)
              );
              break;
            case 'puzzle':
              eventButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`submit_puzzle_${selectedTeam}`).setLabel('Submit Puzzle Answer').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`forfeit_puzzle_${selectedTeam}`).setLabel('Forfeit Puzzle').setStyle(ButtonStyle.Danger)
              );
              break;
            case 'transport link':
              eventButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`use_transport_${selectedTeam}`).setLabel('Use Transport Link').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`choose_direction_${selectedTeam}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary)
              );
              break;
            case 'quest':
              eventButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`start_quest_${selectedTeam}`).setLabel('Start Quest').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`choose_direction_${selectedTeam}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary)
              );
              break;
            default:
              eventButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`choose_direction_${selectedTeam}`).setLabel('Choose Direction').setStyle(ButtonStyle.Primary)
              );
          }

          // Send the event message and options after the map
          await channel.send({ embeds: [eventEmbed], components: [eventButtons] });
        } else {
          // No event, just send the map and event message
          await channel.send(eventMessage);
        }
      }

      const teamChannelLink = `<#${channelId}>`;
      await interaction.editReply({
        content: `Team ${selectedTeam} moved ${direction} to ${newTile}. The update has been posted to the team's channel: ${teamChannelLink}.`,
      });

    } catch (error) {
      console.error(`Error moving team ${selectedTeam}:`, error);
      await interaction.editReply({
        content: 'Failed to move the team. Please try again later.',
      });
    }
  }
};
