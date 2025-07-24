require('dotenv').config()
const {Client, Events, PermissionsBitField, MessageFlags, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, disableValidators} = require("discord.js")
const config = require("./config.json")
const fs = require('fs')
var Lang = require('./langs/es.json');

const client = new Client({
    intents: 53608447
})

//Player Setup

const { Player, useQueue, useTimeline, GuildQueueAudioFilters, GuildQueueEvent } = require('discord-player');
const { DefaultExtractors, SpotifyExtractor } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const { DeezerExtractor } = require('discord-player-deezer');
const player = new Player(client);
player.extractors.loadMulti(DefaultExtractors);
player.extractors.register(YoutubeiExtractor, {})


//Bot Setup

client.on(Events.ClientReady, async() => {
    console.log('Re-BensonBot Ready')
})

client.login(config.token)

//Comandos

client.on(Events.InteractionCreate, async (int) => {

    //Language Command

    if(int.commandName == 'language'){
        const lang = int.options.getString('lang')
        const guild = int.guild
        if(lang == 'es'){
            int.reply({content: Lang.command.langChanged, flags: MessageFlags.Ephemeral})
        } else if(lang == 'en'){
            int.reply({content: Lang.command.langChanged, flags: MessageFlags.Ephemeral})
    }}

    //Autocomplete Play
    
    if(int.commandName == 'play' && int.isAutocomplete()){
        const search = await int.options.getString('search', true)
        if(search.length < 3 || !search){ return int.respond([]) }
        try {
        const results = await player.search(search)

        if(!results || !results.tracks || results.tracks === 0){return int.respond({name: 'No se han encontrado resultados', value: 0})}
        return int.respond(results.tracks.slice(0, 10).map((track) => ({
            name: '🎵 ' + track.title.slice(0, 95),
            value: track.url
        })))
        } catch(e){ console.log(e) }
    }

    //Play Command

    if(int.commandName == 'play' && !int.isAutocomplete()){
        const vChat = int.member.voice.channel
        if(!vChat) { return int.reply({content: Lang.warning.mustVC, flags: MessageFlags.Ephemeral}) }
        
        const pex = vChat.permissionsFor(int.client.user)

        if(!pex.has(PermissionsBitField.Flags.Connect) || !pex.has(PermissionsBitField.Flags.Speak)) 
            { return int.reply({content: Lang.warning.noPerms, flags: MessageFlags.Ephemeral}) }

        await int.deferReply()
        
        let song = int.options.getString('search')
        let priority = int.options.getBoolean('priority')
        if(!priority) { priority = false }

        let queue = player.nodes.get(int.guild.id);
        if (queue) { queue.metadata.int = int }

        try {
            if (!priority) {
            queue = await player.play(vChat, song, {
                nodeOptions: {
                    metadata: { int: int, playMsg: '' },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 30000,
                    leaveOnEnd: false,
                    leaveOnStop: false,
                },
                requestedBy: int.user
            })}
            else { search = await player.search(song, { requestedBy: int.user })
                queue.insertTrack( search.tracks[0], 0 )
            console.log('Sigmaaaaaaaaaaaaaaaa',search.tracks[0]) }

        } catch(e){
            console.log(e)
            int.editReply({content: Lang.warning.errorPlaying, flags: MessageFlags.Ephemeral})
        }

    }
    
    //Pause Command

    if(int.commandName == 'pause' || int.customId == 'pause'){

        let cmd = false; if(int.isChatInputCommand()) {cmd = true}
        const queue = useQueue(int.guild.id)
        if(!queue && cmd) { return int.reply({content: Lang.warning.noQueue, flags: MessageFlags.Ephemeral}) }
        if(!queue) { return }
        
        if(!cmd){ int.deferUpdate() }

        if(queue.node.isPaused()){ 
            queue.metadata.embed.setFooter({text: `${Lang.playMsg.resumedBy} ${int.user.displayName}`, iconURL: int.user.displayAvatarURL()})
            if(cmd){ int.reply({ content: Lang.command.resume, flags: MessageFlags.Ephemeral }) }
            queue.metadata.actionRow.components[1].setEmoji(Lang.emotes.resume)}
        else { 
            queue.metadata.embed.setFooter({text: `${Lang.playMsg.pausedBy} ${int.user.displayName}`, iconURL: int.user.displayAvatarURL()})
            if(cmd){ int.reply({ content: Lang.command.pause, flags: MessageFlags.Ephemeral }) }
            queue.metadata.actionRow.components[1].setEmoji(Lang.emotes.pause)}
        
        queue.node.isPaused() ? queue.node.resume() : queue.node.pause()
        
        queue.metadata.playMsg = await queue.metadata.playMsg.edit({embeds: [queue.metadata.embed], components: [queue.metadata.actionRow]})

    }


    //Stop Command

    if(int.commandName == 'stop' || int.customId == 'stop'){
        const queue = useQueue(int.guild.id)

        if(int.isChatInputCommand()){
        if(!queue) { return int.reply({content: Lang.warning.noQueue, flags: MessageFlags.Ephemeral}) }
        int.reply({content: Lang.command.stop})} else { int.deferUpdate() }
        if (!queue) { return }
        
        const newEmbed = new EmbedBuilder(queue.metadata.playMsg.embeds[0])
        newEmbed.setFooter({text: `${Lang.playMsg.stoppedBy} ${int.user.displayName}`, iconURL: int.user.displayAvatarURL()})
        queue.metadata.playMsg = await queue.metadata.playMsg.edit({embeds: [newEmbed]})
        queue.setRepeatMode(0)
        queue.node.stop()
    }

    //Skip Command

    if(int.commandName == 'skip' || int.customId == 'skip'){
        const queue = useQueue(int.guild.id)

        if(!queue) { 
            if(int.isChatInputCommand()){
                return int.reply({content: Lang.warning.noQueue, flags: MessageFlags.Ephemeral})
            } return
        }
        const newEmbed = queue.metadata.embed.setFooter({text: `${Lang.playMsg.skippedBy} ${int.user.displayName}`, iconURL: int.user.displayAvatarURL()})
        queue.metadata.playMsg = await queue.metadata.playMsg.edit({embeds: [newEmbed]})

        if(int.isChatInputCommand()){
        let quantity = Math.min(int.options.getNumber('quantity'), queue.tracks.size)
        if( quantity == 0 ){ queue.node.skip(); quantity = 1 }
        else { queue.node.skipTo(quantity-1) }
        queue.node.resume()
        quantity == 1 ? int.reply({content: Lang.command.skip})
        : int.reply({content: Lang.command.skip_1 + quantity + Lang.command.skip_2})} 

        else {
            queue.node.skip(); queue.node.resume()
            int.deferUpdate()}
    }

    //AutoPlay Command

    if(int.commandName == 'autoplay' || int.customId == 'autoplay'){
        const queue = useQueue(int.guild.id)

        if(!queue) { 
        if(int.isChatInputCommand()){
        return int.reply({content: Lang.warning.noQueue, flags: MessageFlags.Ephemeral})
        } return }

        if (!int.isChatInputCommand()) { int.deferUpdate() }

        if(queue.repeatMode != 3){
            if(int.isChatInputCommand()) { int.reply({conetent: Lang.command.autoplayE}) }
            queue.metadata.actionRow.components[3].setStyle(ButtonStyle.Primary)
            queue.metadata.actionRow.components[2].setDisabled(false)
            queue.setRepeatMode(3)}

        else { if(int.isChatInputCommand()) { int.reply({conetent: Lang.command.autoplayD}) }
            queue.metadata.actionRow.components[3].setStyle(ButtonStyle.Secondary)
            if(queue.getSize == 0){ queue.metadata.actionRow.components[2].setDisabled(true) }
            queue.setRepeatMode(0)
        }

        queue.metadata.playMsg = await queue.metadata.playMsg.edit({components: [queue.metadata.actionRow]})
    }

    //Shuffle Command
    
    if(int.commandName == 'shuffle'){
        const queue = useQueue(int.guild.id)
        if(!queue) { return int.reply({content: Lang.warning.noQueue, flags: MessageFlags.Ephemeral}) }
        if(queue.tracks.size < 2) { return int.reply({content: Lang.warning.noShuffle, flags: MessageFlags.Ephemeral}) }

        queue.tracks.shuffle()
        int.reply({content: Lang.command.shuffle})
    }

})

//Eventos

player.events.on('playerStart', async (queue, track) => {

    let playMsg = queue.metadata.playMsg

    if(playMsg){
    const newAction = new ActionRowBuilder().addComponents(playMsg.components[0].components.map(button => ButtonBuilder.from(button).setDisabled(true)))
    queue.metadata.playMsg = await playMsg.edit({ components: [newAction] })
    }
    const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(Lang.playMsg.playing)
    .setDescription(`[${track.title}](${track.url})\n **${Lang.playMsg.duration}** \`[${track.duration}]\``)
    .setThumbnail(track.thumbnail)
    .setFooter({ text: `${Lang.playMsg.requestedBy} ${track.requestedBy.displayName}`, iconURL: track.requestedBy.displayAvatarURL()});

    const stopbtn = new ButtonBuilder()
    .setEmoji(Lang.emotes.stop)
    .setStyle(ButtonStyle.Danger)
    .setCustomId('stop')

    const pausebtn = new ButtonBuilder()
    .setEmoji(Lang.emotes.resume)
    .setStyle(ButtonStyle.Primary)
    .setCustomId('pause')

    const skipbtn = new ButtonBuilder()
    .setEmoji(Lang.emotes.skip)
    .setStyle(ButtonStyle.Success)
    .setCustomId('skip')
    .setDisabled(true)

    const autoplaybtn = new ButtonBuilder()
    .setEmoji(Lang.emotes.autoplay)
    .setStyle(ButtonStyle.Secondary)
    .setCustomId('autoplay')

    if(queue.getSize() >= 1 || queue.repeatMode == 3) {skipbtn.setDisabled(false)}
    if(queue.repeatMode == 3) {autoplaybtn.setStyle(ButtonStyle.Primary)}

    const actionRow = new ActionRowBuilder().addComponents(stopbtn, pausebtn, skipbtn, autoplaybtn)

    playMsg = await queue.metadata.int.channel.send({embeds: [embed], components: [actionRow]})

    queue.metadata.playMsg = playMsg
    queue.metadata.embed = embed
    queue.metadata.actionRow = actionRow
})

player.events.on('audioTrackAdd', async (queue, track) => {
    queue.metadata.int.editReply({content: Lang.event.addSong + track.title + ` - \`${track.duration}\``})
    try{
    queue.metadata.actionRow.components[2] = queue.metadata.actionRow.components[2].setDisabled(false)
    queue.metadata.playMsg = await queue.metadata.playMsg.edit({components: [queue.metadata.actionRow]})} catch(e){}

})

player.events.on('audioTracksAdd', async (queue, tracks) => {
    let playlist = tracks[0].playlist

    const embed = new EmbedBuilder()
    .setColor(0x6F50A4)
    .setTitle(playlist.title)
    .setURL(playlist.url)
    .setThumbnail(playlist.thumbnail)
    .setDescription(`**${Lang.playMsg.songs}** \`${playlist.tracks.length}\`   **${Lang.playMsg.duration}** \`${playlist.durationFormatted}\` \n ${playlist.description} `)
    .setFooter({ text: `${Lang.playMsg.requestedBy} ${tracks[0].requestedBy.displayName}`, iconURL: tracks[0].requestedBy.displayAvatarURL() })

    queue.metadata.int.editReply({content: Lang.event.addPlaylist + playlist.title, embeds: [embed] })

    try{
        queue.metadata.actionRow.components[2] = queue.metadata.actionRow.components[2].setDisabled(false)
        queue.metadata.playMsg = await queue.metadata.playMsg.edit({components: [queue.metadata.actionRow]})} catch(e){}
})

player.events.on('emptyQueue', async (queue) => {
    const playMsg = queue.metadata.playMsg
    const newAction = new ActionRowBuilder().addComponents(playMsg.components[0].components.map(button => ButtonBuilder.from(button).setDisabled(true)))
    
    queue.metadata.playMsg = await playMsg.edit({ components: [newAction] })
})

player.events.on('emptyChannel', async (queue) => {
    const playMsg = queue.metadata.playMsg
    const newAction = new ActionRowBuilder().addComponents(playMsg.components[0].components.map(button => ButtonBuilder.from(button).setDisabled(true)))
    
    queue.metadata.playMsg = await playMsg.edit({ components: [newAction] })
    queue.delete()
})

player.events.on('playerError', (e) => {
    console.log(e)
})

player.events.on('error', (queue, err) => {
  console.error(err);
  if (!queue?.deleted) queue?.delete();   // comprueba antes de borrar
});
