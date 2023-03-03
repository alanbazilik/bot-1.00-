const Discord = require("discord.js"); //baixar a lib
const client = new Discord.Client({ intents: 32767 }); 
const config = require("./config.json"); 
const prefix = '!'; // define o prefixo do comando
client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'nome-do-canal');
    if (!channel) return;
    channel.send(`Bem-vindo ao servidor, ${member}!`, { 
      files: ['bem-vindo-caralho-welcome.gif']
    });
  });
  client.on('ready', () => {
    console.log(`Bot está online como ${client.user.tag}!`);
  });
  const queue = new Map(); // armazena as músicas em uma fila



  client.on('message', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
  
    const serverQueue = queue.get(message.guild.id);
  
    if (message.content.startsWith(`${prefix}tocar`)) {
      execute(message, serverQueue);
      return;
    } else if (message.content.startsWith(`${prefix}pular`)) {
      skip(message, serverQueue);
      return;
    } else if (message.content.startsWith(`${prefix}parar`)) {
      stop(message, serverQueue);
      return;
    } else {
      message.channel.send('Comando inválido!');
    }
  });
  
  async function execute(message, serverQueue) {
    const args = message.content.split(' ');
  
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.channel.send('Você precisa estar em um canal de voz para tocar música!');
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.channel.send('Eu preciso das permissões para entrar e falar no seu canal de voz!');
    }
  
    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
    };
  
    if (!serverQueue) {
      const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true,
      };
  
      queue.set(message.guild.id, queueContruct);
  
      queueContruct.songs.push(song);
  
      try {
        const connection = await voiceChannel.join();
        queueContruct.connection = connection;
        play(message.guild, queueContruct.songs[0]);
      } catch (err) {
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      serverQueue.songs.push(song);
      return message.channel.send(`${song.title} foi adicionado à fila!`);
    }
  }
  
  function skip(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send('Você precisa estar em um canal de voz para pular a música!');
    if (!serverQueue) return message.channel.send('Não há música que eu possa pular!');
    serverQueue.connection.dispatcher.end();
  }
  
  function stop(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send('Você precisa estar em um canal de voz para parar a música!');
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
  }
  
  function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
  
    const dispatcher = serverQueue.connection.play(ytdl(song.url, { filter: 'audioonly' }))
      .on('finish', () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      })
      .on('error', error => {
        console.error(error);
      });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Tocando agora: **${song.title}**`);
  }
  client.login(config.token);

  