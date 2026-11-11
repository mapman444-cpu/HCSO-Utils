
require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Collection,
    Events
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const http = require('http');

// Render port
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hart County Sheriffs Office bot is online.');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[WEB] Server listening on port ${PORT}`);
});

// Create client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'Commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file =>
    file.endsWith('.js')
);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (!command.data || !command.execute) {
        console.log(`[WARNING] ${file} is missing data or execute.`);
        continue;
    }

    client.commands.set(command.data.name, command);

    console.log(`[COMMAND] Loaded ${command.data.name}`);
    if (command.requiredRoleId) {
        console.log(`[PERMISSIONS] ${command.data.name}: ${command.requiredRoleId}`);
    }
}

// Bot ready
client.once(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    console.log(`Loaded ${client.commands.size} commands`);

    readyClient.user.setActivity('Hart County Sheriffs Office');
});

// Handle interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        return interaction.reply({
            content: 'This command could not be found.',
            ephemeral: true
        });
    }

    try {
        // Check required role
        if (command.requiredRoleId) {
            if (!interaction.inGuild()) {
                return interaction.reply({
                    content: 'This command can only be used inside a server.',
                    ephemeral: true
                });
            }

            const member = await interaction.guild.members.fetch(
                interaction.user.id
            );

            if (!member.roles.cache.has(command.requiredRoleId)) {
                return interaction.reply({
                    content: 'You do not have permission to use this command.',
                    ephemeral: true
                });
            }
        }

        // Execute command
        await command.execute(interaction);

    } catch (error) {
        console.error(`[COMMAND ERROR] ${interaction.commandName}:`, error);

        const reply = {
            content: 'An error occurred while executing this command.',
            ephemeral: true
        };

        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(reply).catch(() => {});
        } else {
            await interaction.reply(reply).catch(() => {});
        }
    }
});

// Error handling
client.on(Events.Error, error => {
    console.error('[CLIENT ERROR]', error);
});

// Check token
if (!process.env.TOKEN) {
    console.error('[ERROR] TOKEN is missing from your .env file.');
    process.exit(1);
}

// Login
client.login(process.env.TOKEN);
