const tmi = require('tmi.js');
const fetch = require('node-fetch');
require('dotenv').config()

// Bot configuration
const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_USERNAME,
    password: process.env.TWITCH_PASSWORD}, 
  channels: [process.env.CHANNEL_NAME] 
});
 
const jwtToken = process.env.STREAMELEMENTS_JWT_TOKEN;

client.connect();

client.on('message', (channel, tags, message, self) => {
  if (self) return;

  if (message.toLowerCase() === '!witchtime') {
    const username = tags.username; 

    const apiUrl = `https://api.streamelements.com/kappa/v2/points/${process.env.CHANNEL_ID}/${username}`; 

    fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${jwtToken}` 
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.watchtime && !isNaN(data.watchtime)) { 
          const watchtimeHours = Math.round(data.watchtime / 60); 
          client.say(channel, `/me @${tags.username} is watching ${CHANNEL_NAME} ${watchtimeHours} hours`);
        } else {
          client.say(channel, `@${tags.username}, no watchtime found.`);
        }
      })
      .catch(error => {
        console.error('Error fetchting watchtime:', error);
        client.say(channel, 'Oops, something went wrong.');
      });
  } else if (message.toLowerCase() === '!top') {
    const apiUrl = `https://api.streamelements.com/kappa/v2/points/${process.env.CHANNEL_ID}/watchtime?limit=10`; 

    fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.users && data.users.length > 0) {
          const usernames = data.users.map(user => user.username); 

          //Only for testing purposes
          //console.log(usernames);

          const fetchWatchtimePromises = usernames.map(username => {
            const encodedUsername = encodeURIComponent(username);
            const apiUrl = `https://api.streamelements.com/kappa/v2/points/${process.env.CHANNEL_ID}/${encodedUsername}`;
            return fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${jwtToken}`
              }
            })
              .then(res => res.json())
              .then(userData => {
                if (userData.watchtime && !isNaN(userData.watchtime)) {
                  return { username, watchtime: userData.watchtime };
                } else {
                  return { username, watchtime: 0 }; 
                }
              })
              .catch(error => { 
                console.error(`Fehler beim Abrufen der Watchtime für ${username}:`, error);
                return { username, watchtime: 0 }; 
              });
          });

          Promise.all(fetchWatchtimePromises)
            .then(watchtimeData => {
              const topUsersWithWatchtime = watchtimeData
                .sort((a, b) => b.watchtime - a.watchtime) 
                .slice(0, 10) 
                .map((user, index) => {
                  const watchtimeHours = Math.round(user.watchtime / 60);
                  return `${index + 1}. ${user.username} (${watchtimeHours} Stunden)`;
                });

              client.say(channel, `Top 10 Viewers: ${topUsersWithWatchtime.join(', ')}`);
            })
            .catch(error => {
              console.error('Error fetching data:', error);
              client.say(channel, 'Oops, something went wrong!');
            });
        } else {
          client.say(channel, 'No viewers found');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        client.say(channel, 'OOPS! Did you do something wrong?');
      });
  }
});