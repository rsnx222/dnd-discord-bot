// approveScreenshot.js

const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { approveScreenshot } = require('../helpers/approveRejectScreenshot');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Approve Screenshot')
    .setType(ApplicationCommandType.Message),  // Attach to a message (right-click context menu)

  async execute(interaction) {
    const message = interaction.targetMessage;
    const eventName = extractEventFromMessage(message);  // Logic to determine the event from the message content

    if (!eventName) {
      await interaction.reply({ content: 'No event found for this screenshot.', ephemeral: true });
      return;
    }

    await approveScreenshot(interaction, eventName);
  }
};

function extractEventFromMessage(message) {
  // Add logic here to extract event name from message content or metadata
  return /* extracted event name */;
}
