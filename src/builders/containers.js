const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder,
    SectionBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const { formatPrintDate } = require('../utils/date');

/**
 * Formata a lista de membros de uma call no padrão:
 *   - <@USER_ID> `username`
 * @param {Array<{ id: string, tag: string }>} members
 * @returns {string}
 */
function formatMemberList(members = []) {
    if (!members || members.length === 0) {
        return '  - Ninguém na chamada';
    }
    return members.map(m => `  - <@${m.id}> \`${m.tag || m.username || m.id}\``).join('\n');
}

/**
 * Traduz os dispositivos do clientStatus do Discord para formato legível
 * @param {object} clientStatus - ex: { desktop: 'online', mobile: 'idle' }
 * @returns {string}
 */
function formatDevices(clientStatus = {}) {
    if (!clientStatus || Object.keys(clientStatus).length === 0) {
        return 'Nenhum';
    }

    const deviceMap = {
        desktop: 'Desktop (Computador)',
        mobile: 'Mobile (Celular)',
        web: 'Web (Navegador)'
    };

    const active = Object.keys(clientStatus)
        .filter(key => Boolean(clientStatus[key]))
        .map(key => deviceMap[key] || key);

    return active.length > 0 ? active.join(', ') : 'Nenhum';
}

/**
 * Container 1: ENTROU NO CANAL DE VOZ
 */
function buildVoiceJoinContainer({ user, channelId, members = [], printDate }) {
    const dateStr = printDate || formatPrintDate();
    const avatarUrl = user.displayAvatarURL || user.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const tag = user.tag || user.username || user.id;
    const memberListStr = formatMemberList(members);
    const memberCount = members.length;

    const contentText = [
        `- <:member_info:1535046416559251527> **Usuário:**`,
        `  - **Menção:** <@${user.id}>`,
        `- <:detail:1535051580527612004> **Detalhes:**`,
        `  - **ID:** \`${user.id}\``,
        `  - **Tag:** \`${tag}\``,
        `- <:voice_lines:1535062720250904709> **Chamada:**`,
        `  - **Menção:** <#${channelId}>`,
        `- <:voice_list:1535062771757088868> **Membros na Chamada**: \`${memberCount}\``,
        memberListStr
    ].join('\n');

    return new ContainerBuilder()
        .setAccentColor(65280) // 0x00FF00
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Entrou no Canal de Voz**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(avatarUrl)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(contentText)
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Data de Impressão: **${dateStr}**`)
        );
}

/**
 * Container 2: SAIU DO CANAL DE VOZ
 */
function buildVoiceLeaveContainer({ user, channelId, members = [], printDate }) {
    const dateStr = printDate || formatPrintDate();
    const avatarUrl = user.displayAvatarURL || user.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const tag = user.tag || user.username || user.id;
    const memberListStr = formatMemberList(members);
    const memberCount = members.length;

    const contentText = [
        `- <:member_info:1535046416559251527> **Usuário:**`,
        `  - **Menção:** <@${user.id}>`,
        `- <:detail:1535051580527612004> **Detalhes:**`,
        `  - **ID:** \`${user.id}\``,
        `  - **Tag:** \`${tag}\``,
        `- <:voice_lines:1535062720250904709> **Chamada:**`,
        `  - **Menção:** <#${channelId}>`,
        `- <:voice_list:1535062771757088868> **Membros na Chamada**: \`${memberCount}\``,
        memberListStr
    ].join('\n');

    return new ContainerBuilder()
        .setAccentColor(16711680) // 0xFF0000
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Saiu do Canal de Voz**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(avatarUrl)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(contentText)
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Data de Impressão: **${dateStr}**`)
        );
}

/**
 * Container 3: TROCOU DE CANAL
 */
function buildVoiceSwitchContainer({ user, oldChannelId, newChannelId, members = [], printDate }) {
    const dateStr = printDate || formatPrintDate();
    const avatarUrl = user.displayAvatarURL || user.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const tag = user.tag || user.username || user.id;
    const memberListStr = formatMemberList(members);
    const memberCount = members.length;

    const contentText = [
        `- <:member_info:1535046416559251527> **Usuário:**`,
        `  - **Menção:** <@${user.id}>`,
        `- <:detail:1535051580527612004> **Detalhes:**`,
        `  - **ID:** \`${user.id}\``,
        `  - **Tag:** \`${tag}\``,
        `- <:voice_lines:1535062720250904709> **Chamada:**`,
        `  - **Anterior:** <#${oldChannelId}>`,
        `  - **Atual:** <#${newChannelId}>`,
        `- <:voice_list:1535062771757088868> **Membros na Chamada**: \`${memberCount}\``,
        memberListStr
    ].join('\n');

    return new ContainerBuilder()
        .setAccentColor(15844367) // 0xF1C40F
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('<:change_voice:1535061839451390012> **Trocou de Canal**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(avatarUrl)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(contentText)
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Data de Impressão: **${dateStr}**`)
        );
}

/**
 * Container 4: ALTEROU SEU AVATAR
 */
function buildAvatarUpdateContainer({ attachmentFileName = 'avatar.png', printDate }) {
    const dateStr = printDate || formatPrintDate();

    return new ContainerBuilder()
        .setAccentColor(15105570) // 0xE67E22
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Alterou seu Avatar**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(`attachment://${attachmentFileName}`)
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Data de Impressão: **${dateStr}**`)
        );
}

/**
 * Container 5: FICOU ONLINE
 */
function buildOnlineContainer({ user, clientStatus = {}, printDate }) {
    const dateStr = printDate || formatPrintDate();
    const avatarUrl = user.displayAvatarURL || user.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const tag = user.tag || user.username || user.id;
    const deviceStr = formatDevices(clientStatus);

    const contentText = [
        `- <:member_info:1535046416559251527> **Usuário:**`,
        `  - **Menção:** <@${user.id}>`,
        `- <:detail:1535051580527612004> **Detalhes:**`,
        `  - **ID:** \`${user.id}\``,
        `  - **Tag:** \`${tag}\``,
        `  - **Dispositivo:** \`${deviceStr}\``
    ].join('\n');

    return new ContainerBuilder()
        .setAccentColor(65280) // 0x00FF00
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Ficou Online**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(avatarUrl)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(contentText)
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Data de Impressão: **${dateStr}**`)
        );
}

/**
 * Container 6: DISPOSITIVO DESCONECTOU-SE
 */
function buildDeviceDisconnectedContainer({ user, clientStatus = {}, printDate }) {
    const dateStr = printDate || formatPrintDate();
    const avatarUrl = user.displayAvatarURL || user.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const tag = user.tag || user.username || user.id;
    const deviceStr = formatDevices(clientStatus);

    const contentText = [
        `- <:member_info:1535046416559251527> **Usuário:**`,
        `  - **Menção:** <@${user.id}>`,
        `- <:detail:1535051580527612004> **Detalhes:**`,
        `  - **ID:** \`${user.id}\``,
        `  - **Tag:** \`${tag}\``,
        `  - **Dispositivo:** \`${deviceStr}\``
    ].join('\n');

    return new ContainerBuilder()
        .setAccentColor(5048064)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Dispositivo Desconectou-se**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(avatarUrl)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(contentText)
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Data de Impressão: **${dateStr}**`)
        );
}

/**
 * Container 7: OFFLINE
 */
function buildOfflineContainer({ user, printDate }) {
    const dateStr = printDate || formatPrintDate();
    const avatarUrl = user.displayAvatarURL || user.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const tag = user.tag || user.username || user.id;

    const contentText = [
        `- <:member_info:1535046416559251527> **Usuário:**`,
        `  - **Menção:** <@${user.id}>`,
        `- <:detail:1535051580527612004> **Detalhes:**`,
        `  - **ID:** \`${user.id}\``,
        `  - **Tag:** \`${tag}\``
    ].join('\n');

    return new ContainerBuilder()
        .setAccentColor(16711680) // 0xFF0000
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Offline**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(avatarUrl)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(contentText)
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Data de Impressão: **${dateStr}**`)
        );
}

/**
 * Container: DISPOSITIVO CONECTOU-SE (Quando entra por outro dispositivo enquanto já está online)
 */
function buildDeviceConnectedContainer({ user, clientStatus = {}, printDate }) {
    const dateStr = printDate || formatPrintDate();
    const avatarUrl = user.displayAvatarURL || user.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const tag = user.tag || user.username || user.id;
    const deviceStr = formatDevices(clientStatus);

    const contentText = [
        `- <:member_info:1535046416559251527> **Usuário:**`,
        `  - **Menção:** <@${user.id}>`,
        `- <:detail:1535051580527612004> **Detalhes:**`,
        `  - **ID:** \`${user.id}\``,
        `  - **Tag:** \`${tag}\``,
        `  - **Dispositivo:** \`${deviceStr}\``
    ].join('\n');

    return new ContainerBuilder()
        .setAccentColor(65280) // 0x00FF00
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Dispositivo Conectou-se**')
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(avatarUrl)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(contentText)
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Data de Impressão: **${dateStr}**`)
        );
}

module.exports = {
    formatMemberList,
    formatDevices,
    buildVoiceJoinContainer,
    buildVoiceLeaveContainer,
    buildVoiceSwitchContainer,
    buildAvatarUpdateContainer,
    buildOnlineContainer,
    buildDeviceConnectedContainer,
    buildDeviceDisconnectedContainer,
    buildOfflineContainer
};
