
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const config = require('../config.js');
const generateCaseId = require('../Utils/generatecaseid.js');

const RECENT = new Map();
const WINDOW = 5000;

function shouldProcessInteraction(interaction) {
    const key = `${interaction.user.id}:${interaction.commandName}`;
    const now = Date.now();

    if (RECENT.has(key)) {
        const last = RECENT.get(key);
        if (now - last < WINDOW) return false;
    }

    RECENT.set(key, now);
    return true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infraction-issue')
        .setDescription('Issue an infraction to a deputy.')

        .addUserOption(option =>
            option.setName('deputy')
                .setDescription('Deputy receiving the infraction.')
                .setRequired(true)
        )

        .addRoleOption(option =>
            option.setName('employee_rank')
                .setDescription("Input the deputy's rank.")
                .setRequired(true)
        )

        .addRoleOption(option =>
            option.setName('punishment')
                .setDescription('Select the punishment.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the infraction.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Optional notes.')
                .setRequired(false)
        )

        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {

        if (!shouldProcessInteraction(interaction)) {
            return interaction.reply({
                content: 'Please wait a few seconds before using this command again.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const targetUser = interaction.options.getUser('deputy');
            const rankRole = interaction.options.getRole('employee_rank');
            const punishmentRole = interaction.options.getRole('punishment');

            const reason = interaction.options.getString('reason');
            const notes = interaction.options.getString('notes') || 'None';

            const caseId = generateCaseId();

            const date = new Date();
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

            const member = await interaction.guild.members.fetch(targetUser.id);

            // Apply punishment role
            await member.roles.add(punishmentRole.id);

            // Build infraction embed
            const embed = new EmbedBuilder()
                .setTitle(`${config.HCSO_LOGO || ''} Hart County Sheriff's Office Infraction`)    
                .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
                .setImage('https://media.discordapp.net/attachments/1567303562776682567/1569863171475374222/infraction.png?ex=6af50082&is=6af3af02&hm=82dda2d90405326d157f7e1070be0de921ce8acf1293143950a18552219477c5&animated=true')
                .addFields(
                    { name: 'Deputy', value: `${targetUser}` },
                    { name: 'Employee Rank', value: `<@&${rankRole.id}>` },
                    { name: 'Punishment', value: `<@&${punishmentRole.id}>` },
                    { name: 'Reason', value: reason },
                    { name: 'Notes', value: notes },
                    { name: 'Issued By', value: `${interaction.user}` },
                    { name: 'Case ID', value: caseId }
                )
                .setFooter({ text: `Date: ${formattedDate}` });

            const logChannel = interaction.guild.channels.cache.get(
                config.infractionLogChannel
            );

            if (!logChannel || !logChannel.isTextBased()) {
                throw new Error('Infraction log channel was not found or is not text-based.');
            }

            // Send the embed once
            await logChannel.send({
                embeds: [embed],
                allowedMentions: {
                   users: [...new Set([targetUser.id, interaction.user.id])],
                   roles: [...new Set([rankRole.id, punishmentRole.id])]
}
            });

            await interaction.editReply(
                'Successfully issued the infraction!'
            );

        } catch (error) {
            console.error('Infraction command error:', error);

            await interaction.editReply(
                'An error occurred while issuing this infraction. Check the bot console for details.'
            ).catch(() => {});
        }
    }
};
