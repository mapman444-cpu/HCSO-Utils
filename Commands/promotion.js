
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const config = require('../config.js');
const generateCaseId = require('../Utils/generatecaseid.js');

const PROTECTED_ROLES = [
    "1553400726070239247",
    "1553415444906643466"
];

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
    requiredRoleId: '1553400726078623812',

    data: new SlashCommandBuilder()
        .setName('promotion-issue')
        .setDescription('Promote a deputy.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

        .addUserOption(option =>
            option.setName('user')
                .setDescription('Deputy being promoted.')
                .setRequired(true)
        )

        .addRoleOption(option =>
            option.setName('new_rank')
                .setDescription('Rank they are being promoted to.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('new_callsign')
                .setDescription('New callsign for the deputy.')
                .setRequired(true)
        )

        .addRoleOption(option =>
            option.setName('old_rank')
                .setDescription('Rank they are being promoted from.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('old_callsign')
                .setDescription('Old callsign for the deputy.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the promotion.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Optional notes.')
                .setRequired(false)
        ),

    async execute(interaction) {

        if (!shouldProcessInteraction(interaction)) {
            return interaction.reply({
                content: 'Please wait a few seconds before using this command again.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const user = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(user.id);
            const targetUser = member.user;

            const newRank = interaction.options.getRole('new_rank');
            const oldRank = interaction.options.getRole('old_rank');

            const newCallsign = interaction.options.getString('new_callsign');
            const oldCallsign = interaction.options.getString('old_callsign');

            const reason = interaction.options.getString('reason');
            const notes = interaction.options.getString('notes') || 'None';

            const caseId = generateCaseId();

            const now = new Date();
            const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

            // Remove old rank unless protected
            if (!PROTECTED_ROLES.includes(oldRank.id)) {
                await member.roles.remove(oldRank.id);
            }

            // Add new rank
            await member.roles.add(newRank.id);

            // Build promotion embed
            const embed = new EmbedBuilder()
                .setTitle(`${config.HCSO_LOGO || ''} Hart County Sheriff's Office Promotion`)
                .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
                .setImage('https://media.discordapp.net/attachments/1567303562776682567/1569863170896429067/promotion.png?ex=6af50082&is=6af3af02&hm=672f3f4cf6a72986620c05e8f3278298c66f9e63bc161317225ea3850523f39f&animated=true')
                .addFields(
                    { name: 'Deputy', value: `${targetUser}` },
                    { name: 'Old Rank', value: `<@&${oldRank.id}>` },
                    { name: 'Old Callsign', value: oldCallsign },
                    { name: 'New Rank', value: `<@&${newRank.id}>` },
                    { name: 'New Callsign', value: newCallsign },
                    { name: 'Reason', value: reason },
                    { name: 'Notes', value: notes },
                    { name: 'Case ID', value: caseId }
                )
                .setFooter({ text: `Date: ${formattedDate}` });

            const logChannel = interaction.guild.channels.cache.get(
                config.promotionLogChannel
            );

            if (!logChannel || !logChannel.isTextBased()) {
                throw new Error('Promotion log channel was not found or is not text-based.');
            }

            // Send the embed once
            await logChannel.send({
                embeds: [embed],
                allowedMentions: {
                    users: [...new Set([targetUser.id, interaction.user.id])],
                    roles: [...new Set([oldRank.id, newRank.id])]
                }
            });

            await interaction.editReply(
                'Successfully promoted the deputy!'
            );

        } catch (error) {
            console.error('Promotion command error:', error);

            await interaction.editReply(
                'An error occurred while processing this promotion. Check the bot console for details.'
            ).catch(() => {});
        }
    }
};
