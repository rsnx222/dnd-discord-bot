// approveRejectScreenshot.js

const { logger } = require('./logger');
const {
  updateApprovedScreenshots,
  markEventAsCompleted,
  getApprovedScreenshots,
  updateApprovedItems,
  insertNewEventProgress,
  getEventProgressStatus,
  markEventAsForfeited,
  isScreenshotProcessed,
  markScreenshotAsProcessed
} = require('./databaseHelper');
const { applyReward } = require('./rewardsPenaltiesHandler');
const { sendMapAndEvent } = require('./sendMapAndEvent');
const tiles = require('../config/tiles');

// Helper function to get event data from tiles.js
function getEventData(eventName) {
  const event = tiles[eventName];
  return event ? event : null;
}

// Function to get a random completion message
function getRandomCompletionMessage() {
  const messages = [
    "Task completed! Your team breathes a sigh of relief...",
    "Well done! The challenge has been conquered.",
    "Success! Your team celebrates this victory.",
    "Achievement unlocked! The path forward is clear.",
    "Great job! Your team feels more confident.",
    "Victory! The obstacles have been overcome."
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Approve screenshot logic after confirmation
async function approveScreenshot(interaction, teamName, eventName, eventIndex) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.targetMessage.id;

    // Check if this screenshot has already been processed
    if (await isScreenshotProcessed(teamName, eventName, messageId)) {
      return await interaction.followUp({ content: 'This screenshot has already been processed.', ephemeral: true });
    }

    const eventData = getEventData(eventName);
    const { requiredItems, requiredScreenshots } = eventData || {};
    let currentApproved;

    // Check if event_progress exists for this team and event
    let status = await getEventProgressStatus(teamName, eventName);
    if (!status) {
      // No event_progress entry yet, insert one with status 'in_progress'
      await insertNewEventProgress(teamName, eventName, 0, 0);
    }

    if (requiredScreenshots) {
      currentApproved = await getApprovedScreenshots(teamName, eventName);
      const updatedApproved = currentApproved + 1;

      await updateApprovedScreenshots(teamName, eventName, updatedApproved);
      await interaction.targetMessage.react('✅');
      await interaction.followUp({ content: `Screenshot approved for ${teamName}. Total approved: ${updatedApproved}/${requiredScreenshots}`, ephemeral: true });

      // Mark screenshot as processed
      await markScreenshotAsProcessed(teamName, eventName, messageId, 'approved');

      if (updatedApproved >= requiredScreenshots) {
        await markEventAsCompleted(teamName, eventName);
        const completionMessage = getRandomCompletionMessage();
        await interaction.channel.send(`${completionMessage}`);
        await applyReward(teamName, eventName);
        const channel = interaction.channel;
        await sendMapAndEvent(teamName, eventName, interaction, channel, eventIndex, true); // Handle multiple events with eventIndex
      }
    } else if (requiredItems) {
      currentApproved = await getApprovedItems(teamName, eventName);
      const updatedApproved = currentApproved + 1;

      await updateApprovedItems(teamName, eventName, updatedApproved);
      await interaction.targetMessage.react('✅');
      await interaction.followUp({ content: `Item approved for ${teamName}. Total approved: ${updatedApproved}/${requiredItems}`, ephemeral: true });

      // Mark screenshot as processed
      await markScreenshotAsProcessed(teamName, eventName, messageId, 'approved');

      if (updatedApproved >= requiredItems) {
        await markEventAsCompleted(teamName, eventName);
        const completionMessage = getRandomCompletionMessage();
        await interaction.channel.send(`${completionMessage}`);
        await applyReward(teamName, eventName);
        const channel = interaction.channel;
        await sendMapAndEvent(teamName, eventName, interaction, channel, eventIndex, true);
      }
    } else {
      // If neither requiredScreenshots nor requiredItems is specified
      await interaction.followUp({ content: 'This event does not require approvals.', ephemeral: true });
    }
  } catch (error) {
    logger('Error approving screenshot:', error);
    if (!interaction.replied) {
      await interaction.followUp({ content: 'Failed to approve screenshot.', ephemeral: true });
    }
  }
}

// Reject screenshot logic after confirmation
async function rejectScreenshot(interaction, teamName, eventName, eventIndex) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.targetMessage.id;

    // Check if this screenshot has already been processed
    if (await isScreenshotProcessed(teamName, eventName, messageId)) {
      return await interaction.followUp({ content: 'This screenshot has already been processed.', ephemeral: true });
    }

    // Mark screenshot as processed
    await markScreenshotAsProcessed(teamName, eventName, messageId, 'rejected');

    // React to the message to indicate rejection
    await interaction.targetMessage.react('❌');
    await interaction.followUp({ content: `Screenshot rejected for ${teamName} in event ${eventName}.`, ephemeral: true });

  } catch (error) {
    logger('Error rejecting screenshot:', error);
    if (!interaction.replied) {
      await interaction.followUp({ content: 'Failed to reject screenshot.', ephemeral: true });
    }
  }
}

module.exports = {
  approveScreenshot,
  rejectScreenshot,
};
