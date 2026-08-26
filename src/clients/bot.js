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
        this.sharedGuilds = new Map();
        this.presenceInterval = null;

        this.setupEvents();
    }

    setupEvents() {
        this.client.on(Events.ClientReady, async () => {
            console.log(`[Bot] Conectado como ${this.client.user.tag} (ID: ${this.client.user.id})`);
            await this.syncInitialPresence();
            this.startPresenceSyncInterval();
        });

        this.client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
            if (!newPresence || newPresence.userId !== config.targetUserId) return;
            await this.handlePresenceUpdate(oldPresence, newPresence);
        });

        this.client.on(Events.GuildMemberAdd, async (member) => {
            if (member.id === config.targetUserId) {
                console.log(`[Bot] Membro monitorado entrou no servidor "${member.guild.name}" (${member.guild.id})`);
                await this.syncInitialPresence();
            }
        });

        this.client.on('error', (err) => {
            console.error('[Bot] Erro no cliente:', err);
        });
    }

    /**
     * Procura todos os servidores em que o bot e o membro monitorado estão juntos
     * @returns {Promise<Array<{ guild: import('discord.js').Guild, member: import('discord.js').GuildMember, presence: import('discord.js').Presence | null }>>}
     */
    async findSharedGuilds() {
        const shared = [];
        for (const guild of this.client.guilds.cache.values()) {
            try {
                const member = await guild.members.fetch({
                    user: config.targetUserId,
                    force: true,
                    withPresences: true
                });
                if (member) {
                    shared.push({
                        guild,
                        member,
                        presence: member.presence || null
                    });
                    this.sharedGuilds.set(guild.id, guild);
                }
            } catch (_) {
                // O membro não está neste servidor
            }
        }
        return shared;
    }

    /**
     * Busca o status e presença atualizados do membro no servidor compartilhado com o bot
     */
    async fetchPresenceFromSharedGuild() {
        const sharedList = await this.findSharedGuilds();
        if (sharedList.length === 0) {
            return null;
        }

        // Dá prioridade para o servidor onde o membro possui presença ativa (online/idle/dnd)
        const active = sharedList.find(s => s.presence && s.presence.status !== 'offline') || sharedList[0];
        return {
            guild: active.guild,
            member: active.member,
            presence: active.presence,
            status: active.presence?.status || 'offline',
            clientStatus: active.presence?.clientStatus || {}
        };
    }

    /**
     * Localiza o servidor compartilhado entre o bot e o membro e sincroniza o status inicial
     */
    async syncInitialPresence() {
        try {
            console.log(`[Bot] Buscando servidores compartilhados com o membro ${config.targetUserId}...`);
            const data = await this.fetchPresenceFromSharedGuild();

            if (!data) {
                console.warn(`[Bot] ⚠️ O membro ${config.targetUserId} NÃO foi encontrado em nenhum servidor em que o bot está.`);
                console.warn(`[Bot] Certifique-se de que o bot e o usuário monitorado estejam no mesmo servidor do Discord e que a 'Presence Intent' esteja ativada no Developer Portal.`);
                return;
            }

            const { guild, member, status, clientStatus } = data;
            const devices = Object.keys(clientStatus).filter(d => Boolean(clientStatus[d])).sort().join(',');

            this.lastPresence = {
                status: status,
                clientStatus: clientStatus
            };
            this.lastFingerprint = `${status}:${devices}`;

            console.log(`[Bot] ✅ Servidor compartilhado encontrado: "${guild.name}" (ID: ${guild.id})`);
            console.log(`[Bot] Membro: ${member.user.tag} (ID: ${member.user.id})`);
            console.log(`[Bot] Status inicial sincronizado: ${status} | Dispositivos: [${Object.keys(clientStatus).join(', ') || 'Nenhum'}]`);
        } catch (e) {
            console.warn('[Bot] Falha ao sincronizar presença inicial:', e.message);
        }
    }

    /**
     * Inicia a verificação periódica de presença no servidor compartilhado
     */
    startPresenceSyncInterval() {
        if (this.presenceInterval) clearInterval(this.presenceInterval);
        this.presenceInterval = setInterval(async () => {
            try {
                const data = await this.fetchPresenceFromSharedGuild();
                if (data && data.presence) {
                    await this.handlePresenceUpdate(this.lastPresence, data.presence);
                }
            } catch (_) {
                // Silencioso em caso de erro transitório
            }
        }, 20000);
    }

    /**
     * Processa presença repassada pelo selfbot caso o bot receba evento bruto
     */
    async handleRawPresence({ userId, status, clientStatus, user }) {
        if (userId !== config.targetUserId) return;

        // Tenta puxar a presença real direto do servidor compartilhado
        const sharedData = await this.fetchPresenceFromSharedGuild();
        if (sharedData && sharedData.presence) {
            await this.handlePresenceUpdate(this.lastPresence, sharedData.presence);
            return;
        }

        const effectiveStatus = status || (clientStatus && Object.keys(clientStatus).length > 0 ? 'online' : 'offline');
        const fakePresence = {
            userId,
            status: effectiveStatus,
            clientStatus: clientStatus || {},
            member: {
                user: {
                    id: userId,
                    tag: user?.tag || user?.username || userId,
                    username: user?.username || userId,
                    displayAvatarURL: (opts) => user?.avatar
                        ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${opts?.extension || 'png'}?size=${opts?.size || 1024}`
                        : `https://cdn.discordapp.com/embed/avatars/${(BigInt(userId) >> 22n) % 6n}.png`
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

            // Resolve dados do usuário (priorizando fetch caso falte informações)
            let userObj = newPresence.member?.user || newPresence.user;
            if (!userObj || !userObj.username) {
                try {
                    userObj = await this.client.users.fetch(newPresence.userId);
                } catch (_) {}
            }

            const user = {
                id: newPresence.userId,
                tag: userObj?.tag || userObj?.username || newPresence.userId,
                username: userObj?.username || newPresence.userId,
                avatarURL: userObj?.displayAvatarURL
                    ? userObj.displayAvatarURL({ extension: 'png', size: 1024 })
                    : (userObj?.avatar
                        ? `https://cdn.discordapp.com/avatars/${newPresence.userId}/${userObj.avatar}.png?size=1024`
                        : `https://cdn.discordapp.com/embed/avatars/${(BigInt(newPresence.userId) >> 22n) % 6n}.png`)
            };

            console.log(`[Bot] Mudança de presença para ${user.tag}: [${prevDevices.join(', ')}] -> [${newDevices.join(', ')}] (Status: ${newStatus})`);

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
