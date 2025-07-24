onst config = require('./config.json');
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const rest = new REST({version: '10'}).setToken(config.token);

const commands = [
    {
        name: "language",
        description: "Select the bot language",
        options: [{
            name: "lang",
            description: "Choose a language",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: "Español", value: "es" },
                { name: "English", value: "en" }
            ]
        }]
    },
    {
        name:"play",
        description:"Reproduce una canción indicando un nombre o una URL",
        options:[{
            name: "search",
            description: "Nombre de la canción o URL a buscar",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true},
            {
            name: "priority",
            description:"Selecciona si la canción se colocará al inicio de la cola de canciones o no",
            type: ApplicationCommandOptionType.Boolean,
            choices: [{name: "Si", value: true}, {name: "No", value: false}],
            required: false}]
    },
    {
        name:"playlist",
        description: "Reproduce una playlist de canciones indicando un nombre o una URL",
        options:[{
            name:"list",
            description: "Nombre de la playlist a buscar",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true}]
    },
    {
        name:"stop",
        description:"Detiene y elimina la cola de canciones",
    },
    {
        name:"pause",
        description:"Pausa la cola de canciones",
    },
    {
        name:"skip",
        description:"Salta una o varias canciones de la cola",
        options:[{
            name: "quantity",
            description: "Selecciona la cantidad de canciones a saltar",
            type: ApplicationCommandOptionType.Number,
            min_value: 1,
            required: true}]
    },
    {
        name: "list",
        description: "Muestra la lista de canciones a reproducir"
    },
    {
        name: "volume",
        description:"Cambia el volumen de reproducción de música de BensonBot",
        options:[{
            name:"volumen",
            description: "Ingresa el volumen de reproducción",
            type: ApplicationCommandOptionType.Number,
            min_value: 1,
            max_value: 300,
            required: true}]
    },
    {
        name:"shuffle",
        description:"Cambia el orden de las canciones de manera aleatoria"
    },
    {
        name:"autoplay",
        description: "Reproduce canciones aleatorias al finalizar la cola de canciones",
    },
    {
        name: "dj",
        description: "Dj agregará canciones a la cola relacionadas con lo que le pidas",
        options:[{
            name: "related",
            description: "Ingresa el tipo de canciones a buscar / artistas, etc..",
            type: ApplicationCommandOptionType.String,
            min_length: 3,
            max_length: 100,
            required: true},
        {
            name: "cantidad",
            description: "La cantidad de canciones a agregar",
            type: ApplicationCommandOptionType.Integer,
            min_value: 1,
            max_value: 30,
            required: true}]
    }
];

registerGlobal();

async function registerGlobal() {
    try {
        await rest.put(Routes.applicationCommands(config.clientID), { body: commands });
        console.log('Slash commands ready global');
    } catch (e) {
        console.log(`Ha ocurrido un error ${e}`);
    }
}
