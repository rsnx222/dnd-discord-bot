// commands/clear.js

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears all messages in the current channel (Admin only)'),
  async execute(interaction) {
    // Check if the user has the Administrator permission
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    // Check if the bot has the necessary permissions
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: 'I do not have permission to manage messages in this channel.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.channel;
    let messagesDeleted = 0;

    try {
      // Fetch and delete messages in chunks due to API limitations
      let fetched;
      do {
        fetched = await channel.messages.fetch({ limit: 100 });
        
        // Filter out messages older than 14 days
        const deletableMessages = fetched.filter(msg => !msg.pinned && (Date.now() - msg.createdTimestamp) < 14 * 24 * 60 * 60 * 1000);

        if (deletableMessages.size > 0) {
          await channel.bulkDelete(deletableMessages, true);
          messagesDeleted += deletableMessages.size;
        }

      } while (fetched.size >= 2);

      await interaction.editReply(`Successfully cleared ${messagesDeleted} messages.`);
    } catch (error) {
      if (error.code === 10008) {
        console.error('Error: Attempted to delete unknown message(s).');
      } else {
        console.error('Error clearing messages:', error);
      }
      await interaction.editReply('An error occurred while trying to clear messages. Some messages may be too old to delete.');
    }
  },
};
