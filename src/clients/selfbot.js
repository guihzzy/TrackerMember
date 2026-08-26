require('../polyfills');

const { Client } = require('discord.js-selfbot-v13');
const { config } = require('../config');

class SelfbotClient {
    /**
     * @param {import('./bot').BotClient} botDispatcher
     */
    constructor(botDispatcher) {
        this.bot = botDispatcher;
        this.client = new Client({
            checkUpdate: false
        });

        this.lastAvatarHash = null;
        this.lastAvatarTime = 0;
        this.targetUserCache = null;
        this.lastVoiceKey = null;
        this.lastVoiceTime = 0;

        this.setupEvents();
    }

    setupEvents() {
        this.client.on('ready', async () => {
            console.log(`[Selfbot] Conectado como ${this.client.user.tag} (ID: ${this.client.user.id})`);
            await this.cacheInitialTargetUser();
        });

        // Monitora mudanças de canais de voz
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            if (oldState.id !== config.targetUserId && newState.id !== config.targetUserId) return;
            this.handleVoiceStateUpdate(oldState, newState);
        });

        // Monitora atualização de usuário via eventos nativos
        this.client.on('userUpdate', (oldUser, newUser) => {
            if (newUser.id !== config.targetUserId) return;
            this.handleUserUpdate(oldUser, newUser);
        });

        // Monitora pacotes brutos do WebSocket para garantir captura imediata de avatar
        this.client.on('raw', (packet) => {
            this.handleRawPacket(packet);
        });

        this.client.on('error', (err) => {
            console.error('[Selfbot] Erro no cliente:', err);
        });
    }

    /**
     * Cache inicial dos dados do usuário monitorado
     */
    async cacheInitialTargetUser() {
        try {
            let user = this.client.users.cache.get(config.targetUserId);

            // 1. Tenta buscar via endpoint de perfil da API do Discord (compatível com contas de usuário)
            if (!user) {
                try {
                    const profile = await this.client.api.users(config.targetUserId).profile.get({
                        query: { with_mutual_guilds: true, with_mutual_friends_count: true }
                    });
                    if (profile && profile.user) {
                        const rawUser = profile.user;
                        user = {
                            id: rawUser.id,
                            username: rawUser.username,
                            avatar: rawUser.avatar,
                            tag: rawUser.discriminator && rawUser.discriminator !== '0'
                                ? `${rawUser.username}#${rawUser.discriminator}`
                                : rawUser.username,
                            displayAvatarURL: (opts) => rawUser.avatar
                                ? `https://cdn.discordapp.com/avatars/${rawUser.id}/${rawUser.avatar}.${rawUser.avatar.startsWith('a_') ? 'gif' : (opts?.extension || 'png')}?size=${opts?.size || 1024}`
                                : `https://cdn.discordapp.com/embed/avatars/${(BigInt(rawUser.id) >> 22n) % 6n}.png`
                        };
                    }
                } catch (_) {}
            }

            // 2. Fallback: Se não encontrou, busca através do Bot Oficial
            if (!user && this.bot?.client) {
                try {
                    const botUser = await this.bot.client.users.fetch(config.targetUserId);
                    if (botUser) {
                        user = botUser;
                    }
                } catch (_) {}
            }

            if (user) {
                this.targetUserCache = user;
                this.lastAvatarHash = user.avatar;
                const tag = user.tag || user.username || config.targetUserId;
                console.log(`[Selfbot] Usuário monitorado carregado: ${tag} (Avatar: ${user.avatar || 'padrão'})`);
            }
        } catch (e) {
            console.warn(`[Selfbot] Não foi possível buscar usuário ${config.targetUserId} no início:`, e.message);
        }
    }

    /**
     * Processa movimentação em canais de voz
     */
    async handleVoiceStateUpdate(oldState, newState) {
        try {
            const member = newState.member || oldState.member;
            const userObj = member?.user || this.targetUserCache || { id: config.targetUserId };
            const user = {
                id: userObj.id,
                tag: userObj.tag || userObj.username || config.targetUserId,
                username: userObj.username || config.targetUserId,
                displayAvatarURL: userObj.displayAvatarURL ? userObj.displayAvatarURL({ dynamic: true, size: 1024 }) : null
            };

            const oldChannelId = oldState.channelId;
            const newChannelId = newState.channelId;

            // Se não houve mudança real de canal, ignora (ex: mute/unmute/deafen)
            if (oldChannelId === newChannelId) return;

            const voiceKey = `${oldChannelId || 'none'}->${newChannelId || 'none'}`;
            const now = Date.now();
            if (this.lastVoiceKey === voiceKey && now - this.lastVoiceTime < 1500) {
                return;
            }
            this.lastVoiceKey = voiceKey;
            this.lastVoiceTime = now;

            // 1. Entrou no canal de voz
            if (!oldChannelId && newChannelId) {
                const channel = newState.channel;
                const members = channel ? Array.from(channel.members.values()).map(m => ({
                    id: m.id,
                    tag: m.user?.tag || m.user?.username || m.displayName,
                    username: m.user?.username || m.displayName
                })) : [{ id: user.id, tag: user.tag, username: user.username }];

                console.log(`[Selfbot] ${user.tag} ENTROU no canal ${newChannelId} (Total: ${members.length})`);
                await this.bot.dispatchVoiceJoin({
                    user,
                    channelId: newChannelId,
                    members
                });
            }
            // 2. Saiu do canal de voz
            else if (oldChannelId && !newChannelId) {
                const channel = oldState.channel;
                const members = channel ? Array.from(channel.members.values()).map(m => ({
                    id: m.id,
                    tag: m.user?.tag || m.user?.username || m.displayName,
                    username: m.user?.username || m.displayName
                })) : [];

                console.log(`[Selfbot] ${user.tag} SAIU do canal ${oldChannelId} (Restantes: ${members.length})`);
                await this.bot.dispatchVoiceLeave({
                    user,
                    channelId: oldChannelId,
                    members
                });
            }
            // 3. Trocou de canal de voz
            else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
                const channel = newState.channel;
                const members = channel ? Array.from(channel.members.values()).map(m => ({
                    id: m.id,
                    tag: m.user?.tag || m.user?.username || m.displayName,
                    username: m.user?.username || m.displayName
                })) : [{ id: user.id, tag: user.tag, username: user.username }];

                console.log(`[Selfbot] ${user.tag} TROCOU de canal ${oldChannelId} -> ${newChannelId} (Total: ${members.length})`);
                await this.bot.dispatchVoiceSwitch({
                    user,
                    oldChannelId,
                    newChannelId,
                    members
                });
            }
        } catch (err) {
            console.error('[Selfbot] Erro ao tratar voiceStateUpdate:', err);
        }
    }

    /**
     * Processa evento nativo de userUpdate para troca de avatar
     */
    async handleUserUpdate(oldUser, newUser) {
        if (oldUser.avatar !== newUser.avatar && newUser.avatar) {
            const now = Date.now();
            if (this.lastAvatarHash === newUser.avatar && now - this.lastAvatarTime < 5000) return;

            console.log(`[Selfbot] userUpdate: Avatar mudou de ${oldUser.avatar} para ${newUser.avatar}`);
            this.lastAvatarHash = newUser.avatar;
            this.lastAvatarTime = now;
            const newAvatarUrl = newUser.displayAvatarURL({ dynamic: true, size: 4096 });
            await this.bot.dispatchAvatarUpdate({
                user: {
                    id: newUser.id,
                    tag: newUser.tag,
                    username: newUser.username
                },
                newAvatarUrl
            });
        }
    }

    /**
     * Processa pacotes brutos do WebSocket para avatar e presença
     */
    async handleRawPacket(packet) {
        if (!packet || !packet.t || !packet.d) return;

        const eventType = packet.t;
        const data = packet.d;

        // USER_UPDATE
        if (eventType === 'USER_UPDATE' && data.id === config.targetUserId) {
            if (data.avatar && data.avatar !== this.lastAvatarHash) {
                const now = Date.now();
                if (this.lastAvatarHash === data.avatar && now - this.lastAvatarTime < 5000) return;

                console.log(`[Selfbot] raw USER_UPDATE: Novo avatar detectado ${data.avatar}`);
                const oldHash = this.lastAvatarHash;
                this.lastAvatarHash = data.avatar;
                this.lastAvatarTime = now;
                
                if (oldHash !== null) {
                    const ext = data.avatar.startsWith('a_') ? 'gif' : 'png';
                    const avatarUrl = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${ext}?size=4096`;
                    await this.bot.dispatchAvatarUpdate({
                        user: {
                            id: data.id,
                            tag: `${data.username}#${data.discriminator || '0'}`,
                            username: data.username
                        },
                        newAvatarUrl: avatarUrl
                    });
                }
            }
        }

        // GUILD_MEMBER_UPDATE
        if (eventType === 'GUILD_MEMBER_UPDATE' && data.user && data.user.id === config.targetUserId) {
            const avatar = data.user.avatar;
            if (avatar && avatar !== this.lastAvatarHash) {
                const now = Date.now();
                if (this.lastAvatarHash === avatar && now - this.lastAvatarTime < 5000) return;

                console.log(`[Selfbot] raw GUILD_MEMBER_UPDATE: Novo avatar detectado ${avatar}`);
                const oldHash = this.lastAvatarHash;
                this.lastAvatarHash = avatar;
                this.lastAvatarTime = now;

                if (oldHash !== null) {
                    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
                    const avatarUrl = `https://cdn.discordapp.com/avatars/${data.user.id}/${avatar}.${ext}?size=4096`;
                    await this.bot.dispatchAvatarUpdate({
                        user: {
                            id: data.user.id,
                            tag: `${data.user.username}#${data.user.discriminator || '0'}`,
                            username: data.user.username
                        },
                        newAvatarUrl: avatarUrl
                    });
                }
            }
        }

        // PRESENCE_UPDATE (WebSocket Presence do selfbot para garantir detecção imediata de dispositivos)
        if (eventType === 'PRESENCE_UPDATE' && data.user && data.user.id === config.targetUserId) {
            if (data.client_status) {
                await this.bot.handleRawPresence({
                    userId: data.user.id,
                    status: data.status,
                    clientStatus: data.client_status,
                    user: data.user
                });
            }
        }
    }

    async start() {
        if (!config.token) {
            console.error('[Selfbot] TOKEN não informado.');
            return;
        }
        await this.client.login(config.token);
    }
}

module.exports = { SelfbotClient };
