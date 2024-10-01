const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { reloadCommand, reloadHelper } = require('../helpers/commandManager');
const { checkRole } = require('../helpers/checkRole');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a command or a helper'),

    async execute(interaction) {
        // Check if the user has the necessary role to reload commands
        if (!checkRole(interaction.member, 'admin')) {
            return interaction.reply({ content: 'You do not have permission to reload commands.', ephemeral: true });
        }

        // Get a list of command and helper files
        const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
        const helperFiles = fs.readdirSync(path.join(__dirname, '../helpers')).filter(file => file.endsWith('.js'));

        // Combine both command and helper files in the dropdown
        const options = [
            ...commandFiles.map(file => ({ label: `Command: ${file.replace('.js', '')}`, value: `command_${file.replace('.js', '')}` })),
            ...helperFiles.map(file => ({ label: `Helper: ${file.replace('.js', '')}`, value: `helper_${file.replace('.js', '')}` }))
        ];

        // Split options into chunks of 25 (Discord.js limit)
        const chunkSize = 25;
        const chunks = [];
        for (let i = 0; i < options.length; i += chunkSize) {
            chunks.push(options.slice(i, i + chunkSize));
        }

        // Create action rows for each chunk
        const rows = chunks.map((chunk, index) =>
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`select_reload_${index}`)
                    .setPlaceholder('Select a command or helper to reload')
                    .addOptions(chunk)
            )
        );

        // Send the dropdown menus to the user
        await interaction.reply({
            content: 'Please select a command or helper to reload:',
            components: rows,
            ephemeral: true
        });

        // Handle the user's selection
        const filter = i => i.customId.startsWith('select_reload') && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            const [type, name] = i.values[0].split('_');
            let success;
            if (type === 'command') {
                success = await reloadCommand(name);
            } else if (type === 'helper') {
                success = await reloadHelper(name);
            }

            if (success) {
                await i.update({ content: `${type === 'command' ? 'Command' : 'Helper'} \`${name}\` was reloaded successfully!`, components: [], ephemeral: true });
            } else {
                await i.update({ content: `Failed to reload ${type} \`${name}\`.`, components: [], ephemeral: true });
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                await interaction.editReply({ content: 'No selection made. Please try again.', components: [], ephemeral: true });
            }
        });
    },
};
