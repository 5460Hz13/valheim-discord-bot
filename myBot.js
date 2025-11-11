//fix import
import { createRequire } from "module";
const require = createRequire(import.meta.url);

//fix path
import path1 from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path1.dirname(__filename);

//init gamedig for statusqueries
import { GameDig } from 'gamedig';

//setup dc
import { REST, Routes } from 'discord.js';
const { clientId, guildId, token, serverList_channelId, myServerIp, statusMsgId, adminName, password } = require('./config.json');

//set commands
const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'status',  
        description: 'Attempts to give back Status',
    }
];



//update commands
const rest = new REST({ version: '10' }).setToken(token);

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    
    console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
} catch (error) {
    console.error(error);
}

import { Client, Events, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

//update status message with server status info
function StartUpdates(msg) {
    //new message to update
    if(!statusMsgId){
        const statusMsgId = msg.id;
    }
    //fetch s message to update
    else
        msg.id = statusMsgId;
    
        function GetStatusUpdate() {
        //get status
        return GameDig.query({
            type: 'valheim',
            host: `${myServerIp}`,
            port: 2457,
            givenPortOnly: true,
            requestRules: false
        }).catch((err) => {msg.edit({
            content:`valheimserver is OFFLINE
            pls contact ${adminName}`,

        })}).then(status => {
            //update status
            if(!status) {
                msg.edit({
                    content:
                        `valheimserver is OFFLINE
                        bot by ${adminName}`,
                })
            }
            else{
                msg.edit({
                    content: `valheimserver ***${status.name}*** is **ONLINE** with ${status.numplayers}/${status.maxplayers} Players 
                    > **[Join using: steam://connect/${status.connect}?appid=${status.raw.appId}]** 
                    > *(just paste link into your browser and hit 'ok'. password is: ${password})* 
                    
                    > bot by ${adminName}`,
                })                
            }
        }).catch(err => console.log(err))
    }
    
    const getStatus = setInterval(GetStatusUpdate, 30000);
}


//announce
client.on(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
    client.channels.fetch(serverList_channelId)
        .then(channel => {
            if (channel.isTextBased()) {
                //make new message
                if(!statusMsgId){
                    channel.send({
                        content: 'Preheating status message..',
                        ephemeral: true
                    })
                        .then(msg => (StartUpdates(msg)));
                }
                //get prior message
                else{
                    channel.messages.edit(statusMsgId, {
                        content: 'Rebooting data mines..',
                        ephemeral: true,
                    })
                        .then(msg => (StartUpdates(msg)));

                }
                
            } else {
                console.error('The channel is not a text-based channel.');
            }
        })
        .catch(console.error);
});


//react
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    }
    if (interaction.commandName === 'status') {
        await interaction.reply('Find my status updates in [#server-list](<'+'https://discord.com/channels/'+guildId+'/'+serverList_channelId+'>)');
    }
});


client.login(token);

