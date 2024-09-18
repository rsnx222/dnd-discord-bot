// rejectScreenshot.js

const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { rejectScreenshot } = require('../helpers/approveRejectScreenshot');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Reject Screenshot')
    .setType(ApplicationCommandType.Message),  // Attach to a message (right-click context menu)

  async execute(interaction) {
    const message = interaction.targetMessage;
    const eventName = extractEventFromMessage(message);  // Logic to determine the event from the message content

    if (!eventName) {
      await interaction.reply({ content: 'No event found for this screenshot.', ephemeral: true });
      return;
    }

    await rejectScreenshot(interaction, eventName);
  }
};

function extractEventFromMessage(message) {
  // Add logic here to extract event name from message content or metadata
  return /* extracted event name */;
}
