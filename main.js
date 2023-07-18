require('dotenv').config();

const token = String(process.env.TOKEN);
const serverid = String(process.env.SERVERID);
const roleid = String(process.env.ROLEID);
const channelid = String(process.env.CHANNELID);

const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js')
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
})

// Create an empty user list
let userList = {
  users: [],
  assignedUser: null
};

// Load the user list from JSON
if (fs.existsSync('userlist.json')) {
  const userListData = fs.readFileSync('userlist.json');
  userList = JSON.parse(userListData);
  userList.users = Array.from(userList.users);
}
else {
  const userListData = JSON.stringify(userList, null, 2);
  fs.writeFileSync('userlist.json', userListData)
  userList.users = Array.from(userList.users);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.username}`);
  scheduleRoleAssignment();
});

client.on('messageCreate', (message) => {
  // Ignore messages from bots
  if (message.author.bot) {
    return;
  }

  // Check if user is already in the list
  const user = message.author;
  if (!userList.users.includes(user.id)) {
    userList.users.push(user.id);
    console.log(`${user.username} has been added to the user list.`);
    saveUserList();
  }
});

client.on('voiceStateUpdate', (oldState, newState) => {
  const user = newState.member.user;

  // Check if the user joined voice
  if (newState.channel && !oldState.channel) {
    if (!userList.users.includes(user.id)) {
      userList.users.push(user.id);
      console.log(`${user.username} has been added to the user list.`);
      saveUserList();
    }
  }
});

function assignRoleToUser() {
  const guild = client.guilds.cache.get(serverid);
  const channel = client.channels.cache.get(channelid);
  const role = guild.roles.cache.get(roleid);

  if (userList.users.length < 1) {
    return;
  }

  // Remove role from previous user
  if (userList.assignedUser !== null) {
    const member = guild.members.cache.get(userList.assignedUser);
    member.roles.remove(role);
    console.log(`Removed role from user ${member.user.username}`);
  }

  // Assign role to new random user
  const random = Math.floor(Math.random() * userList.users.length);
  while (userList.users[random] == userList.assignedUser && userList.users.length > 1) {
    random = Math.floor(Math.random() * userList.users.length);
  }

  const member = guild.members.cache.get(userList.users[random]);

  if (member) {
    member.roles.add(role).then(() => {
      console.log(`Assigned role to user ${member.user.username}`);
      const embed = new EmbedBuilder()
        .setColor(0xe0707c)
        .setTitle('A New Jester is Being Declared!')
        .setAuthor({ name: `${client.user.username}, the towncrier`, iconURL: `https://cdn.discordapp.com/avatars/${client.user.id}/${client.user.avatar}.webp`, url: 'https://cherikaeru.github.io/' })
        .setDescription('Hear ye, hear ye...')
        .setThumbnail(`https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.webp`)
        .addFields({ name: `**The new jester is ${member.user.username}**`, value: '**Point and laugh at them NOW**' })
        .setTimestamp()
        .setFooter({ text: 'Bot made by cherry (@cherikaeru)', iconURL: `https://images-ext-1.discordapp.net/external/OsFlFECjRgZhjWxHXdsklJJiue5b_FUshIvJsx1BYYI/https/cdn.discordapp.com/avatars/271370042627588096/c08dabc6468147b37e75c2a63fd34798.webp`, url: 'https://cherikaeru.github.io/' });
      channel.send({ embeds: [embed] });
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
  };
}

// Time Related Functions
function scheduleRoleAssignment(offset = 0) {
  const nextDay = getNextDay();
  nextDay.setDate(nextDay.getDate() + offset);
  const timeUntilNextDay = nextDay.getTime() - Date.now();

  setTimeout(() => {
    assignRoleToUser();
    scheduleRoleAssignment(7);
  }, timeUntilNextDay);

}

function getNextDay() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilNextDay = dayOfWeek <= 2 ? 2 - dayOfWeek : 9 - dayOfWeek;
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextDay);
  nextDay.setHours(20, 7, 0, 0); // Set time to 6 PM
  return nextDay;
}

// Update JSON list
function saveUserList() {
  const userListData = JSON.stringify(userList, null, 2);
  fs.writeFileSync('userlist.json', userListData);
  console.log('User list saved');
}

client.login(token);