
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { OpenRouter } = require('@openrouter/sdk');
const dotenv = require("dotenv")
const Groq = require('groq-sdk');
const fs = require("fs")
const { spawn } =  require("child_process");
const ffmpegPath = require("ffmpeg-static");

dotenv.config()

const BOT_START_TIME = Math.floor(Date.now() / 1000);
const ALLOWED_GROUPS = JSON.parse(process.env.ALLOWED_GROUPS)



const groq = new Groq({ apiKey: process.env.GROQ_API_KEY});

function wavToOggOpus(wavBuffer) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      "-i", "pipe:0",
      "-af", "volume=1.5",
      "-c:a", "libopus",
      "-b:a", "64k",
      "-f", "ogg",
      "pipe:1"
    ]);

    const chunks = [];

    ffmpeg.stdout.on("data", chunk => chunks.push(chunk));
    ffmpeg.on("error", reject);
    ffmpeg.on("close", code => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error("FFmpeg falhou"));
    });

    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();
  });
}



function randomNumber(client, message){
    number = parseInt(message.body.slice(8))
    if(!number){
        message.reply("Número Inválido")
        return
    }
    message.reply("🎲🎲 " + (Math.floor(Math.random()*number)+1))

}

function credits(client, message){
    client.sendMessage(message.fromMe?message.to:message.from, `WhatABot é um bot de código aberto para o WhatsApp criado por D4fto

Repositório: https://github.com/D4fto/WhatABot

Criador:
- Github: https://github.com/D4fto
- Portfólio: https://d4fto.github.io/d4fto
- Email: contatopedrotunes@gmail.com
- Linkedin: https://linkedin.com/in/D4fto


Obrigado pelo interesse no projeto
`)
}

function help(client, message){
    client.sendMessage(message.fromMe?message.to:message.from, `Bem vindo ao WhatABot criado por D4fto


Funções disponíveis:
- *!help* - Mostra as funções disponíveis

- *!ia mensagem* - manda a mensagem para uma ia responder

- *!nerd mensagem* - manda a mensagem para uma ia... nerd responder

- *!random número* - Gera um número aleatório entre 1 e o número escolhido

- *!speak mensagem* - Fala a mensagem escrita

- *!credits* - Créditos para o criador do bot


Espero que tenha uma boa experiência
`)
}

async function speak(client, message){
    const model = "canopylabs/orpheus-v1-english";
    const voice = "hannah";
    const text = message.body.slice(6);
    if(!text){
        client.sendMessage(
        message.fromMe?message.to:message.from,
        "Mensagem inválida")
        
        return
    }
    const responseFormat = "wav";
    const response = await groq.audio.speech.create({
        model: model,
        voice: voice,
        input: text,
        response_format: responseFormat
    });
    
    const buffer = Buffer.from(await response.arrayBuffer());

    const oggBuffer = await wavToOggOpus(buffer);

    const base64Audio = oggBuffer.toString("base64");

    const media = new MessageMedia(
        "audio/ogg; codecs=opus",
        base64Audio,
        "audio.ogg"
    );

    await client.sendMessage(
        message.fromMe?message.to:message.from,
        media,
        { sendAudioAsVoice: true }
    );
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
    "!nerd": (client,message)=>iaMessage(client,message,'nerd'),
    "!random": randomNumber,
    "!speak": speak,
    "!credits": credits,
}



const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: 'auth_info'
    }),
    
});



client.on('ready',async () => {
    console.log('Client is ready!');
    // const chats = await client.getChats();

    // const grupos = chats.filter(chat => chat.isGroup);

    // grupos.forEach(g => {

    //     console.log(g.name, g.id._serialized);
    
    // });
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('message_create', message => {
    console.log(message);
    if (message.timestamp < BOT_START_TIME) return;
    if(message.from.includes("@g.us")){
        if(!ALLOWED_GROUPS.includes(message.from)){
            return
        }
    }
    let clearBody = message.body.trim().toLocaleLowerCase()
    for(key in cases){
        console.log(clearBody)
        console.log(key)
        if(clearBody.startsWith(key)){
            cases[key](client,message)
            break
        }
    }

});

client.initialize();
