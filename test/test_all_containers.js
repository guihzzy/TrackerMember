const assert = require('assert');
const {
    buildVoiceJoinContainer,
    buildVoiceLeaveContainer,
    buildVoiceSwitchContainer,
    buildAvatarUpdateContainer,
    buildOnlineContainer,
    buildDeviceConnectedContainer,
    buildDeviceDisconnectedContainer,
    buildOfflineContainer
} = require('../src/builders/containers');

const mockUser = {
    id: '100000000000000001',
    tag: 'usuario_teste',
    username: 'usuario_teste',
    displayAvatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
};

const mockMembers = [
    { id: '100000000000000001', tag: 'usuario_teste' },
    { id: '100000000000000002', tag: 'outro_amigo' }
];

console.log('Iniciando testes dos Containers V2...');

// Teste 1: Entrou no Canal de Voz
const c1 = buildVoiceJoinContainer({
    user: mockUser,
    channelId: '200000000000000001',
    members: mockMembers,
    printDate: '26/08/2026, 15:52:44'
});
const j1 = c1.toJSON();
assert.strictEqual(j1.type, 17);
assert.strictEqual(j1.accent_color, 65280);
console.log('✔ Teste 1 (Entrou no Canal) OK');

// Teste 2: Saiu do Canal de Voz
const c2 = buildVoiceLeaveContainer({
    user: mockUser,
    channelId: '200000000000000001',
    members: [{ id: '100000000000000002', tag: 'outro_amigo' }],
    printDate: '26/08/2026, 15:52:44'
});
const j2 = c2.toJSON();
assert.strictEqual(j2.type, 17);
assert.strictEqual(j2.accent_color, 16711680);
console.log('✔ Teste 2 (Saiu do Canal) OK');

// Teste 3: Trocou de Canal
const c3 = buildVoiceSwitchContainer({
    user: mockUser,
    oldChannelId: '200000000000000001',
    newChannelId: '200000000000000002',
    members: mockMembers,
    printDate: '26/08/2026, 15:49:12'
});
const j3 = c3.toJSON();
assert.strictEqual(j3.type, 17);
assert.strictEqual(j3.accent_color, 15844367);
console.log('✔ Teste 3 (Trocou de Canal) OK');

// Teste 4: Alterou seu Avatar
const c4 = buildAvatarUpdateContainer({
    attachmentFileName: 'avatar_100000000000000001_12345.png',
    printDate: '26/08/2026, 15:52:44'
});
const j4 = c4.toJSON();
assert.strictEqual(j4.type, 17);
assert.strictEqual(j4.accent_color, 15105570);
console.log('✔ Teste 4 (Alterou Avatar) OK');

// Teste 5: Ficou Online
const c5 = buildOnlineContainer({
    user: mockUser,
    clientStatus: { desktop: 'online', mobile: 'idle' },
    printDate: '26/08/2026, 15:49:12'
});
const j5 = c5.toJSON();
assert.strictEqual(j5.type, 17);
assert.strictEqual(j5.accent_color, 65280);
console.log('✔ Teste 5 (Ficou Online) OK');

// Teste 6: Dispositivo Conectou-se
const c6 = buildDeviceConnectedContainer({
    user: mockUser,
    clientStatus: { desktop: 'online', mobile: 'online' },
    printDate: '26/08/2026, 15:49:12'
});
const j6 = c6.toJSON();
assert.strictEqual(j6.type, 17);
assert.strictEqual(j6.accent_color, 65280);
console.log('✔ Teste 6 (Dispositivo Conectou-se) OK');

// Teste 7: Dispositivo Desconectou-se
const c7 = buildDeviceDisconnectedContainer({
    user: mockUser,
    clientStatus: { desktop: 'online' },
    printDate: '26/08/2026, 15:49:12'
});
const j7 = c7.toJSON();
assert.strictEqual(j7.type, 17);
assert.strictEqual(j7.accent_color, 5048064);
console.log('✔ Teste 7 (Dispositivo Desconectou-se) OK');

// Teste 8: Offline
const c8 = buildOfflineContainer({
    user: mockUser,
    printDate: '26/08/2026, 15:49:12'
});
const j8 = c8.toJSON();
assert.strictEqual(j8.type, 17);
assert.strictEqual(j8.accent_color, 16711680);
console.log('✔ Teste 8 (Offline) OK');

console.log('TODOS OS 8 TESTES DE CONTAINERS V2 PASSARAM COM SUCESSO! 🎉');
