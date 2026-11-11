
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const config = require('../config.js');

module.exports = {
    requiredRoleId: '1570114326646226944',

    data: new SlashCommandBuilder()
        .setName('deployment')
        .setDescription('Post an HCSO deployment announcement.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to notify.')
                .setRequired(true)
        )

        .addIntegerOption(option =>
            option.setName('minutes')
                .setDescription('Minutes until deployment.')
                .setMinValue(1)
                .setMaxValue(1440)
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('briefing')
                .setDescription('Briefing and communications information.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('equipment')
                .setDescription('Equipment and vehicle information.')
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('message')
                .setDescription('Additional deployment announcement.')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const role = interaction.options.getRole('role');
            const minutes = interaction.options.getInteger('minutes');
            const briefing = interaction.options.getString('briefing');
            const equipment = interaction.options.getString('equipment');
            const message = interaction.options.getString('message');

            // Get the configured deployment channel
            const deploymentChannel = await interaction.guild.channels.fetch(
                config.deploymentChannelId
            );

            if (
                !deploymentChannel ||
                !deploymentChannel.isTextBased() ||
                !deploymentChannel.send
            ) {
                throw new Error('Deployment channel was not found or cannot receive messages.');
            }

            // Calculate deployment time
            const deploymentTime = Math.floor(
                (Date.now() + minutes * 60 * 1000) / 1000
            );

            // Create deployment embed
            const embed = new EmbedBuilder()
                .setColor('#292929')
                .setTitle('HCSO Deployment')
                .setDescription(
                    `Attention all deputies!\n` +
                    `A new mass deployment is being started.}\n\n` +
                    `The deployment will start in: <t:${deploymentTime}:R>\n` +
                    `**Briefing & Comms:** ${briefing}\n` +
                    `**Equipment/Loadout:** ${equipment}\n\n` +
                    `**React if Attending**\n\n` +
                    `*Protect your family, protect your property, and protect your future.*`
                )
                .setTimestamp();

            if (config.HCSO_LOGO_URL) {
                embed.setThumbnail(config.HCSO_LOGO_URL);
            }

            if (config.DEPLOYMENT_BANNER_URL) {
                embed.setImage(config.DEPLOYMENT_BANNER_URL);
            }

            // Send announcement to the configured channel only
            const announcement = await deploymentChannel.send({
                content: `<@&${role.id}>`,
                embeds: [embed],
                allowedMentions: {
                    roles: [role.id]
                }
            });

            // Add attendance reaction
            await announcement.react('✅');

            await interaction.editReply(
                'Successfully posted the deployment announcement!'
            );

        } catch (error) {
            console.error('Deployment command error:', error);

            await interaction.editReply(
                'There was an error posting the deployment announcement. Check the bot console.'
            ).catch(() => {});
        }
    }
};
