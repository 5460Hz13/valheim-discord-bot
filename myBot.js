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
import {Message, REST, Routes} from 'discord.js';
//required config
const { clientId, guildId, token, serverList_channelId, myServerIp, adminName, password, dataSetFile} = require('./config.json');
//optional config
let statusMsgId = require('./config.json').statusMsgId;
let riddleChannel;

const dataSet = require(`./${dataSetFile}`);

//set commands
const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'status',  
        description: 'Attempts to give back Status',
    },
    {
        name: "riddle",
        description: 'Poses a riddle.',
    }
];

let riddle;
let riddlePosed = false;

//update commands
const rest = new REST({ version: '10' }).setToken(token);

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    
    console.log(`Successfully reloaded ${commands.length} (/) commands.`);
} catch (error) {
    console.error(error);
}

import { Client, Events, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

//update status message with server status info
function StartUpdates(msg) {
        function GetStatusUpdate() {
        //get status
        return GameDig.query({
            type: 'valheim',
            host: `${myServerIp}`,
            port: 2457,
            givenPortOnly: true,
            requestRules: false
        }).then(status => {
            //update status
            if(!status) {
                msg.edit({
                    content:
                        `## valheimserver is OFFLINE
                        ####bot by ${adminName}`,
                })
            }
            else{
                msg.edit({
                    content: `### valheimserver ***${status.name}*** is **ONLINE** with ${status.numplayers}/${status.maxplayers} Players 
                    > **[Join using: steam://connect/${status.connect}?appid=${status.raw.appId}]** 
                    > *(just paste link into your browser and hit 'ok'. password is: ${password})* 
                    
                    #### bot by ${adminName}
                    #### Copyright © 2025 ${adminName}`,
                })                
            }
        }).catch(err => {
            msg.edit({
                content: `##valheimserver is OFFLINE
                #### pls contact ${adminName}`,
            })
        })
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
                        content: '### Preheating status message..'
                    })
                        //then(msg => (StartUpdates(msg)));
                }
                //get prior message
                else {
                    //let getMsg = channel.messages.fetch(statusMsgId)
                    channel.messages.fetch(statusMsgId).then(old_message =>  {
                        old_message.edit({
                            content: '### Rebooting data mines..',
                            
                        })
                        return old_message
                    })
                    .then(old_message => (StartUpdates(old_message)))
                }
                
            } else {
                console.error('The channel is not a text-based channel.');
            }
        })
        .catch(console.error);
});


//react to commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    }
    if (interaction.commandName === 'status') {
        await interaction.reply('Find my status updates in [#server-list](https://discord.com/channels/'+guildId+'/'+serverList_channelId+')');
    }
    if(interaction.commandName === 'riddle') {
        if(!riddlePosed){
            //select riddle
            riddle = dataSet.data[Math.floor(Math.random()*dataSet.data.length)];
            console.log(riddle.name+" has been chosen as riddle to solve")
            //pose riddle
            riddlePosed = true;
            riddleChannel = interaction.channelId;
            await interaction.reply(`## I pose to thee, a question mighty. Name me some ${riddle.description.toLowerCase()} or else, I'll smite yee!`)
        }
        else if(riddlePosed) {
            await interaction.reply("### Im not gonna repeat myself! " +
                "**GUESS** **you fool!**");
            
        }
        else{
            await interaction.reply(`Not what I expected, Mr. Frodo!`);
        }
        
    }
});

//listen for messages
client.on(Events.MessageCreate, (message) => {

    //riddle running? 
    if(riddlePosed){
        
        //wrong channel?
        if(message.channelId === riddleChannel){
            
            if(message.content.toLowerCase().includes(riddle.name.toLowerCase())){
                message.reply({
                    content: `YARRRRR! ${message.author.username} has solved my decrepit riddle! Try it again sometime, test your strength!`,
                    
                })
                //right answer
                console.log("riddle solved, resetting riddle");
                riddlePosed = false;
            }
            else{
                
                //wrong answer
                //console.log("wrong answer");
            }
        }
    }
})

client.login(token);

