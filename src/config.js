require('dotenv').config();

const config = {
    // Token do usuário (selfbot) para monitorar websocket
    token: process.env.TOKEN || '',

    // Token do bot oficial para monitorar presença e enviar containers
    statusBotToken: process.env.STATUS_BOT_TOKEN || '',

    // ID do usuário a ser monitorado
    targetUserId: process.env.TARGET_USER_ID || '',

    // ID do canal onde os logs serão enviados
    logChannelId: process.env.LOG_CHANNEL_ID || '',
};

function validateConfig() {
    const missing = [];
    if (!config.token) missing.push('TOKEN');
    if (!config.statusBotToken) missing.push('STATUS_BOT_TOKEN');
    if (!config.targetUserId) missing.push('TARGET_USER_ID');
    if (!config.logChannelId) missing.push('LOG_CHANNEL_ID');

    if (missing.length > 0) {
        console.warn(`[Config] AVISO: As seguintes variáveis estão ausentes no .env: ${missing.join(', ')}`);
    }
}

module.exports = {
    config,
    validateConfig
};
