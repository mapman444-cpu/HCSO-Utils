
require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "Commands");

if (!fs.existsSync(commandsPath)) {
    console.error("Commands folder was not found.");
    process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file =>
    file.endsWith(".js")
);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
        console.log(`Loaded: ${file}`);
    } else {
        console.warn(`Skipped ${file}: Missing data or execute.`);
    }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Deploying ${commands.length} slash command(s)...`);

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("Successfully deployed all slash commands!");
    } catch (error) {
        console.error("Error deploying commands:", error);
    }
})();
