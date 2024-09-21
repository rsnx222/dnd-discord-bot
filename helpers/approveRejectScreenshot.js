// approveRejectScreenshot.js

const { logger } = require('./logger');
const { 
  updateApprovedScreenshots, 
  markEventAsCompleted, 
  getApprovedScreenshots, 
  updateApprovedItems, 
  insertNewEventProgress, 
  getEventProgressStatus, 
  markEventAsForfeited 
} = require('./databaseHelper');
const { applyReward } = require('./rewardsPenaltiesHandler');
const { sendMapAndEvent } = require('./sendMapAndEvent');
const tiles = require('../config/tiles');

// Helper function to get event data from tiles.js
function getEventData(eventName) {
  const event = tiles[eventName];
  return event ? event : null;
}

// Helper function to check if a screenshot has already been processed
async function isAlreadyProcessed(teamName, eventName) {
  const status = await getEventProgressStatus(teamName, eventName);
  return status === 'completed';
}

// Approve screenshot logic after confirmation
async function approveScreenshot(interaction, teamName, eventName) {
  try {
    await interaction.deferReply({ ephemeral: true }); // Defer the interaction response

    if (await isAlreadyProcessed(teamName, eventName)) {
      return await interaction.followUp({ content: 'This screenshot has already been processed.', ephemeral: true });
    }

    const eventData = getEventData(eventName);
    const { requiredItems, requiredScreenshots } = eventData;
    let currentApproved;

    if (requiredScreenshots) {
      currentApproved = await getApprovedScreenshots(teamName, eventName);
      const updatedApproved = currentApproved + 1;

      if (currentApproved === 0) {
        await insertNewEventProgress(teamName, eventName, updatedApproved);
      }

      await updateApprovedScreenshots(teamName, eventName, updatedApproved);
      await interaction.targetMessage.react('✅');
      await interaction.followUp({ content: `Screenshot approved for ${teamName}. Total approved: ${updatedApproved}/${requiredScreenshots}`, ephemeral: true });

      if (updatedApproved >= requiredScreenshots) {
        await markEventAsCompleted(teamName, eventName);
        await interaction.followUp({ content: `Event ${eventName} completed for ${teamName}!`, ephemeral: true });
        await applyReward(teamName, eventName); // Correct usage of applyReward
        const channel = interaction.channel;
        await sendMapAndEvent(teamName, eventName, interaction, channel, 0, true);
      }
    } else if (requiredItems) {
      currentApproved = await getApprovedItems(teamName, eventName);
      const updatedApproved = currentApproved + 1;

      if (currentApproved === 0) {
        await insertNewEventProgress(teamName, eventName, 0, updatedApproved);
      }

      await updateApprovedItems(teamName, eventName, updatedApproved);
      await interaction.targetMessage.react('✅');
      await interaction.followUp({ content: `Item approved for ${teamName}. Total approved: ${updatedApproved}/${requiredItems}`, ephemeral: true });

      if (updatedApproved >= requiredItems) {
        await markEventAsCompleted(teamName, eventName);
        await interaction.followUp({ content: `Event ${eventName} completed for ${teamName}!`, ephemeral: true });
        await applyReward(teamName, eventName); // Correct usage of applyReward
        const channel = interaction.channel;
        await sendMapAndEvent(teamName, eventName, interaction, channel, 0, true);
      }
    }
  } catch (error) {
    logger('Error approving screenshot:', error);
    if (!interaction.replied) {
      await interaction.followUp({ content: 'Failed to approve screenshot.', ephemeral: true });
    }
  }
}

// Reject screenshot logic after confirmation
async function rejectScreenshot(interaction, teamName, eventName) {
  try {
    await interaction.deferReply({ ephemeral: true }); // Ensure deferred reply

    // Check if this screenshot has already been processed
    if (await isAlreadyProcessed(teamName, eventName)) {
      return await interaction.followUp({ content: 'This screenshot has already been processed.', ephemeral: true });
    }

    // Mark event as rejected in the database
    await markEventAsForfeited(teamName, eventName);
    await interaction.targetMessage.react('❌'); // Add rejection reaction
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
