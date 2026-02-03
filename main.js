
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { OpenRouter } = require('@openrouter/sdk');
const dotenv = require("dotenv")
const Groq = require('groq-sdk');




dotenv.config()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY});




function help(client, message){
    client.sendMessage(message.fromMe?message.to:message.from, `Bem vindo ao WhatABot criado por D4fto


Funções disponíveis:
- *!help* - Mostra as funções disponíveis

- *!ia mensagem* - manda a mensagem para uma ia responder

- *!nerd mensagem* - manda a mensagem para uma ia... nerd responder


Espero que tenha uma boa experiência
`)
}


async function iaMessage(client, message, context=''){
    waitingMessages = {
        'nerd': 'pensando na resposta mais aura 🤓'
    }
    personalities = {
        'nerd': 'Seu nome é Saiko. Você é um nerd que usa muitos emojis 🤓🔥 Sempre faz referências nerds (filmes, games, anime, programação, RPG, Ordem paranormal, Cellbit). Você tem 500 QI, +999999 de aura + ego. Você sempre sabe a resposta'
    }
    client.sendMessage(message.fromMe?message.to:message.from, waitingMessages[context]?waitingMessages[context]:"gerando sua resposta")
    const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
            {
                role: 'system',
                content: `Você deve responder em *português brasileiro* 🇧🇷.

                O nome do usuário é *${message._data.notifyName ? message._data.notifyName : "D4fto"}*.

                Essa resposta será enviada pelo *WhatsApp*, então:
                - Use *asterisco simples* para negrito (exemplo: *texto*)
                - Use hífen (-) para listas
                - Não utilize **negrito duplo**
                - Nunca utilize **negrito duplo**


                Personalidade ativa no contexto:
                ${personalities[context] ? personalities[context] : "pessoa normal, formalmente. Evite blocos longos de texto; prefira mensagens claras e bem espaçadas"}
                `
            },
            {
                role: 'user',
                content: message.body,
            },
        ],
    });
    client.sendMessage(message.fromMe?message.to:message.from, completion.choices[0].message.content)
}


let cases = {
    "!help" : help,
    "!ia" : iaMessage,
    "!nerd": (client,message)=>iaMessage(client,message,'nerd')
}



const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: 'auth_info'
    }),
    
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('message_create', message => {
    let clearBody = message.body.trim().toLocaleLowerCase()
    for(key in cases){
        console.log(clearBody)
        console.log(key)
        if(clearBody.startsWith(key)){
            cases[key](client,message)
            break
        }
    }
	// console.log(message);

});

client.initialize();
