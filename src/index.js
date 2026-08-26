require('./polyfills');

const { validateConfig, config } = require('./config');
const { BotClient } = require('./clients/bot');
const { SelfbotClient } = require('./clients/selfbot');

async function main() {
    console.log('=====================================================');
    console.log('       DISCORD TRACKER MEMBER - SISTEMA INICIADO     ');
    console.log('=====================================================');
    
    validateConfig();

    console.log(`[Config] Usuário Monitorado: ${config.targetUserId}`);
    console.log(`[Config] Canal de Logs: ${config.logChannelId}`);

    const bot = new BotClient();
    const selfbot = new SelfbotClient(bot);

    try {
        console.log('[Init] Inicializando Bot de Status/Envio...');
        await bot.start();

        console.log('[Init] Inicializando Selfbot de Monitoramento...');
        await selfbot.start();

        console.log('[Init] Sistema pronto e monitorando em tempo real!');
    } catch (err) {
        console.error('[Init] Erro ao iniciar clientes:', err);
    }
}

// Tratamento de exceções não capturadas
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Process] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught Exception:', err);
});

main();
