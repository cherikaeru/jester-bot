require('dotenv').config();

const token = process.env.TOKEN;
const serverid = process.env.SERVERID;
const roleid = process.env.ROLEID;
const channelid = process.env.CHANNELID;

const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js')
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences
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
  if (!userList.users) {
    userList.users = Array.from(userList.users);
  }
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

async function assignRoleToUser() {
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
    let old = guild.members.cache.get(userList.assignedUser);
    old.roles.remove(role).then(() => {
      console.log(`Removed role from user ${old.user.username}`);
    }).catch((error) => {
      console.error(`Failed to remove role from user ${old.user.username}: ${error}`);
    });
  }

  console.log(userList.users[random]);
  let member = guild.members.cache.get(userList.users[random]);

  if (member) {
    member.roles.add(role).then(() => {
      console.log(`Assigned role to user ${member.user.username}`);
      const cherry = guild.members.cache.get('271370042627588096')
      const embed = new EmbedBuilder()
        .setColor(0xe0707c)
        .setTitle(`A New ${role.name} is Being Declared!`)
        .setAuthor({ name: `${client.user.username} says...`, iconURL: `https://cdn.discordapp.com/avatars/${client.user.id}/${client.user.avatar}.webp`, url: 'https://cherikaeru.github.io/' })
        .setDescription('Hear ye, hear ye...')
        .setThumbnail(`https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.webp`)
        .addFields({ name: `**The new ${role.name} is ${member.user.username}**`, value: '👏' })
        .setTimestamp()
        .setFooter({ text: `Bot made by cherry (@${guild.members.cache.get('271370042627588096').user.username})`, iconURL: `https://images-ext-1.discordapp.net/external/OsFlFECjRgZhjWxHXdsklJJiue5b_FUshIvJsx1BYYI/https/cdn.discordapp.com/avatars/271370042627588096/${cherry.user.avatar}.webp`, url: 'https://cherikaeru.github.io/' });
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
  const daysUntilNextDay = dayOfWeek <= 2 ? 3 - dayOfWeek : 10 - dayOfWeek;
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextDay);
  nextDay.setHours(18, 30, 0, 0); // Set time to 6:30 PM
  return nextDay;
}

// Update JSON list
function saveUserList() {
  const userListData = JSON.stringify(userList, null, 2);
  fs.writeFileSync('userlist.json', userListData);
  console.log('User list saved');
}

client.login(token);