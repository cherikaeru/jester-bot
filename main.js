require('dotenv').config();

const token = process.env.TOKEN;
const serverid = process.env.SERVERID;
const roleid = process.env.ROLEID;
const channelid = process.env.CHANNELID;
const minimumrole = process.env.MINIMUMROLE;

const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences
  ]
});

// Create an empty user list
let userList = {
  users: [],
  assignedUser: null
};

// Load the user list from JSON
if (fs.existsSync('userlist.json')) {
  const userListData = fs.readFileSync('userlist.json');
  userList = JSON.parse(userListData);
  if (!userList.users) {
    userList.users = Array.from(userList.users);
  }
}
else {
  const userListData = JSON.stringify(userList, null, 2);
  fs.writeFileSync('userlist.json', userListData);
  userList.users = Array.from(userList.users);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.username}`);
  scheduler();
});

function scheduler() {
  scheduleRoleAssignment(getNextDay(), () => {
    assignRoleToUser();
    return scheduler();
  });
}

client.on('messageCreate', (message) => {
  const user = message.author;

  // Ignore messages from bots and people who don't have the minimum role required to be entered
  if (user.bot || !message.member.roles.cache.has(minimumrole)) {
    return;
  }

  // Add random reactions
  if (user.id == userList.assignedUser && Math.random() < 0.125 && fs.existsSync('emojis.json')) {
    var arr = [];
    const emojiList = fs.readFileSync('emojis.json');
    emojis = JSON.parse(emojiList);
    while (arr.length < Math.ceil(Math.random() * 5) + 1) {
      var r = Math.ceil(Math.random() * emojis.length);
      if (arr.indexOf(r) === -1) arr.push(r);
    }
    for (let i = 0; i < arr.length; i++) {
      message.react(emojis[arr[i]]);
    }
    console.log(`Reacted to a message.`);
  }

  // Check if user is already in the list
  if (!userList.users.includes(user.id)) {
    userList.users.push(user.id);
    console.log(`${user.username} has been added to the user list.`);
    saveUserList();
  }
});

async function assignRoleToUser() {
  console.log('Assigning new user to role...');
  const guild = await client.guilds.fetch(serverid);
  const channel = client.channels.cache.get(channelid);
  const role = guild.roles.cache.get(roleid);

  if (userList.users.length < 1) {
    console.log('No users in user list');
  }

  // Assign role to new random user
  var random = Math.floor(Math.random() * userList.users.length);
  while (userList.users[random] == userList.assignedUser && userList.users.length > 1) {
    random = Math.floor(Math.random() * userList.users.length);
  }

  // Remove role from previous user
  if (userList.assignedUser !== null) {
    const old = guild.members.cache.get(userList.assignedUser);
    old.roles.remove(role).then(() => {
      console.log(`Removed role from user ${old.user.username}`);
    }).catch((error) => {
      console.error(`Failed to remove role from user ${old.user.username}: ${error}`);
    });
  }

  const member = guild.members.cache.get(userList.users[random]);

  if (member) {
    member.roles.add(role).then(() => {
      console.log(`Assigned role to user ${member.user.username}`);
      const embed = new EmbedBuilder()
        .setColor(0xe0707c)
        .setTitle(`**The new ${role.name} is ${member.user.username}**`)
        .setAuthor({ name: `${client.user.username} says...`, iconURL: `https://cdn.discordapp.com/avatars/${client.user.id}/${client.user.avatar}.webp`, url: 'https://cherikaeru.github.io/' })
        .setDescription('This announcement was brought to you by a ferret on a laptop:')
        .setThumbnail(`https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.webp`)
        .setImage(`https://cdn.discordapp.com/attachments/1017521827062489160/1131561201525071982/Screenshot_20230502_130302_com.png`)
        .setTimestamp()
        .setFooter({ text: `Bot made by cherry (@${guild.members.cache.get('271370042627588096').user.username})`, iconURL: `https://avatars.githubusercontent.com/u/81542899?v=4`, url: 'https://cherikaeru.github.io/' });
      channel.send({ embeds: [embed] });
      channel.send(`${member}`);
      let assigned = userList.users[random];
      userList = {
        users: [],
        assignedUser: `${assigned}`
      };
      saveUserList();
    }).catch((error) => {
      console.error(`Failed to assign role to user ${member.user.username}: ${error}`);
      userList.assignedUser = null;
    });
  }
}

// Time scheduling
function scheduleRoleAssignment(date, callback) {
  const now = new Date();
  console.log(`Next role assignment: ${date}`);
  setTimeout(callback, date.getTime() - now.getTime());
}

function getNextDay() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilNextDay = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextDay);
  nextDay.setHours(17, 0, 0, 0); // Set time to 5:00 PM
  if (nextDay.getTime() - now.getTime() <= 0) {
    nextDay.setDate(nextDay.getDate() + 7);
  }
  return nextDay;
}

// Update JSON list
function saveUserList() {
  const userListData = JSON.stringify(userList, null, 2);
  fs.writeFileSync('userlist.json', userListData);
}

client.login(token);