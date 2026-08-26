const {
    Client,
    GatewayIntentBits,
    AttachmentBuilder,
    MessageFlags,
    Events
} = require('discord.js');
const { config } = require('../config');
const {
    buildVoiceJoinContainer,
    buildVoiceLeaveContainer,
    buildVoiceSwitchContainer,
    buildAvatarUpdateContainer,
    buildOnlineContainer,
    buildDeviceConnectedContainer,
    buildDeviceDisconnectedContainer,
    buildOfflineContainer
} = require('../builders/containers');
const { downloadAvatar, deleteTempFile } = require('../utils/image');

class BotClient {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildVoiceStates
            ],
            allowedMentions: { parse: [] }
        });

        // Armazena o último status de presença conhecido
        this.lastPresence = {
            status: 'offline',
            clientStatus: {}
        };
        this.lastFingerprint = null;
        this.lastEventTime = 0;
        this.lastAvatarSentUrl = null;
        this.lastAvatarSentTime = 0;

        this.setupEvents();
    }

    setupEvents() {
        this.client.on(Events.ClientReady, () => {
            console.log(`[Bot] Conectado como ${this.client.user.tag} (ID: ${this.client.user.id})`);
            this.syncInitialPresence();
        });

        this.client.on('presenceUpdate', (oldPresence, newPresence) => {
            if (!newPresence || newPresence.userId !== config.targetUserId) return;
            this.handlePresenceUpdate(oldPresence, newPresence);
        });

        this.client.on('error', (err) => {
            console.error('[Bot] Erro no cliente:', err);
        });
    }

    /**
     * Tenta buscar o status inicial do usuário monitorado nos servidores do bot
     */
    syncInitialPresence() {
        try {
            for (const guild of this.client.guilds.cache.values()) {
                const member = guild.members.cache.get(config.targetUserId);
                if (member && member.presence) {
                    const status = member.presence.status || 'offline';
                    const clientStatus = member.presence.clientStatus || {};
                    const devices = Object.keys(clientStatus).filter(d => Boolean(clientStatus[d])).sort().join(',');
                    
                    this.lastPresence = {
                        status: status,
                        clientStatus: clientStatus
                    };
                    this.lastFingerprint = `${status}:${devices}`;
                    console.log(`[Bot] Presença inicial sincronizada para ${config.targetUserId}:`, this.lastPresence);
                    break;
                }
            }
        } catch (e) {
            console.warn('[Bot] Falha ao sincronizar presença inicial:', e.message);
        }
    }

    /**
     * Processa presença repassada pelo selfbot caso o bot não receba
     */
    async handleRawPresence({ userId, status, clientStatus, user }) {
        if (userId !== config.targetUserId) return;
        const fakePresence = {
            userId,
            status,
            clientStatus: clientStatus || {},
            member: {
                user: {
                    id: userId,
                    tag: user?.tag || user?.username || userId,
                    username: user?.username || userId,
                    displayAvatarURL: (opts) => user?.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${opts?.extension || 'png'}?size=${opts?.size || 1024}` : null
                }
            }
        };
        await this.handlePresenceUpdate(this.lastPresence, fakePresence);
    }

    /**
     * Processa atualizações de status / dispositivos do usuário monitorado com anti-duplicação
     */
    async handlePresenceUpdate(oldPresence, newPresence) {
        try {
            const oldClientStatus = (oldPresence && oldPresence.clientStatus) ? oldPresence.clientStatus : this.lastPresence.clientStatus;
            const newClientStatus = newPresence.clientStatus || {};

            const oldDevices = Object.keys(oldClientStatus).filter(d => Boolean(oldClientStatus[d])).sort();
            const newDevices = Object.keys(newClientStatus).filter(d => Boolean(newClientStatus[d])).sort();
            const newStatus = newPresence.status || (newDevices.length > 0 ? 'online' : 'offline');

            // Cria uma assinatura única para o estado atual
            const currentFingerprint = `${newStatus}:${newDevices.join(',')}`;

            // Se o estado for idêntico ao último processado, ignora
            if (this.lastFingerprint === currentFingerprint) {
                return;
            }

            const now = Date.now();
            if (now - this.lastEventTime < 1000 && this.lastFingerprint === currentFingerprint) {
                return;
            }

            // Dispositivos anteriores
            const prevDevices = Object.keys(this.lastPresence.clientStatus || {}).filter(d => Boolean(this.lastPresence.clientStatus[d]));
            
            // Atualiza o estado em memória IMEDIATAMENTE de forma síncrona
            this.lastPresence = {
                status: newStatus,
                clientStatus: newClientStatus
            };
            this.lastFingerprint = currentFingerprint;
            this.lastEventTime = now;

            const user = {
                id: newPresence.userId,
                tag: newPresence.member?.user?.tag || newPresence.member?.user?.username || newPresence.userId,
                username: newPresence.member?.user?.username || newPresence.userId,
                avatarURL: newPresence.member?.user?.displayAvatarURL ? newPresence.member.user.displayAvatarURL({ extension: 'png', size: 1024 }) : null
            };

            console.log(`[Bot] Mudança de presença para ${user.tag}: [${prevDevices.join(', ')}] -> [${newDevices.join(', ')}]`);

            // Caso 1: Ficou Online de vez (tinha 0 dispositivos e agora tem 1+)
            if (prevDevices.length === 0 && newDevices.length > 0) {
                const container = buildOnlineContainer({
                    user,
                    clientStatus: newClientStatus
                });
                await this.sendLog(container);
            }
            // Caso 2: Ficou Offline de vez (tinha dispositivos e agora tem 0)
            else if (prevDevices.length > 0 && newDevices.length === 0) {
                const container = buildOfflineContainer({
                    user
                });
                await this.sendLog(container);
            }
            // Caso 3: Novo dispositivo conectou-se enquanto já estava online (ex: entrou pelo celular enquanto estava no PC)
            else if (prevDevices.length > 0 && newDevices.some(d => !prevDevices.includes(d))) {
                const container = buildDeviceConnectedContainer({
                    user,
                    clientStatus: newClientStatus
                });
                await this.sendLog(container);
            }
            // Caso 4: Algum dispositivo desconectou-se (restando ainda outro dispositivo conectado)
            else if (prevDevices.length > newDevices.length && newDevices.length > 0) {
                const disconnected = prevDevices.filter(d => !newDevices.includes(d));
                if (disconnected.length > 0) {
                    const container = buildDeviceDisconnectedContainer({
                        user,
                        clientStatus: newClientStatus
                    });
                    await this.sendLog(container);
                }
            }
        } catch (err) {
            console.error('[Bot] Erro ao tratar presença:', err);
        }
    }

    /**
     * Envia um Container V2 para o canal de logs configurado
     * @param {import('discord.js').ContainerBuilder} container
     * @param {Array<import('discord.js').AttachmentBuilder>} [files=[]]
     */
    async sendLog(container, files = []) {
        try {
            const channel = await this.client.channels.fetch(config.logChannelId);
            if (!channel) {
                console.error(`[Bot] Canal de logs ${config.logChannelId} não encontrado!`);
                return;
            }

            await channel.send({
                components: [container],
                files: files,
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });

            console.log(`[Bot] Log enviado com sucesso no canal ${channel.id}`);
        } catch (err) {
            console.error('[Bot] Erro ao enviar log:', err);
        }
    }

    /**
     * Despacha evento: Entrou no canal de voz
     */
    async dispatchVoiceJoin({ user, channelId, members }) {
        const container = buildVoiceJoinContainer({
            user,
            channelId,
            members
        });
        await this.sendLog(container);
    }

    /**
     * Despacha evento: Saiu do canal de voz
     */
    async dispatchVoiceLeave({ user, channelId, members }) {
        const container = buildVoiceLeaveContainer({
            user,
            channelId,
            members
        });
        await this.sendLog(container);
    }

    /**
     * Despacha evento: Trocou de canal de voz
     */
    async dispatchVoiceSwitch({ user, oldChannelId, newChannelId, members }) {
        const container = buildVoiceSwitchContainer({
            user,
            oldChannelId,
            newChannelId,
            members
        });
        await this.sendLog(container);
    }

    /**
     * Despacha evento: Alterou seu Avatar
     * Baixa o avatar, anexa no container, envia e deleta o arquivo baixado
     */
    async dispatchAvatarUpdate({ user, newAvatarUrl }) {
        if (!newAvatarUrl) return;

        const now = Date.now();
        // Se for o mesmo avatar ou se foi disparado há menos de 5 segundos, ignora para evitar duplicações
        if (this.lastAvatarSentUrl === newAvatarUrl || (now - this.lastAvatarSentTime < 5000)) {
            return;
        }

        // Atualiza imediatamente o estado síncrono
        this.lastAvatarSentUrl = newAvatarUrl;
        this.lastAvatarSentTime = now;

        let tempFile = null;
        try {
            console.log(`[Bot] Processando alteração de avatar para ${user.id}... Baixando imagem: ${newAvatarUrl}`);
            const { filePath, fileName } = await downloadAvatar(newAvatarUrl, user.id);
            tempFile = filePath;

            const attachment = new AttachmentBuilder(filePath, { name: fileName });
            const container = buildAvatarUpdateContainer({
                attachmentFileName: fileName
            });

            await this.sendLog(container, [attachment]);
            console.log(`[Bot] Container de avatar enviado.`);
        } catch (err) {
            console.error('[Bot] Erro ao processar envio de novo avatar:', err);
        } finally {
            if (tempFile) {
                await deleteTempFile(tempFile);
                console.log(`[Bot] Arquivo temporário ${tempFile} removido.`);
            }
        }
    }

    async start() {
        if (!config.statusBotToken) {
            console.error('[Bot] STATUS_BOT_TOKEN não informado.');
            return;
        }
        await this.client.login(config.statusBotToken);
    }
}

module.exports = { BotClient };
