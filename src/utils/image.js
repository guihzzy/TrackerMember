const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');

// Garante que o diretório temporário exista
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Faz download de uma imagem de avatar e salva em arquivo temporário
 * @param {string} url - URL do avatar
 * @param {string} userId - ID do usuário para identificação
 * @returns {Promise<{ filePath: string, fileName: string }>}
 */
async function downloadAvatar(url, userId) {
    const isGif = url.includes('.gif');
    const ext = isGif ? 'gif' : 'png';
    const fileName = `avatar_${userId}_${Date.now()}.${ext}`;
    const filePath = path.join(TEMP_DIR, fileName);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Falha ao baixar avatar: ${response.statusText} (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(filePath, buffer);

    return { filePath, fileName };
}

/**
 * Remove com segurança um arquivo baixado
 * @param {string} filePath - Caminho do arquivo
 */
async function deleteTempFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    } catch (err) {
        console.error(`[ImageUtils] Erro ao deletar arquivo temporário ${filePath}:`, err.message);
    }
}

module.exports = {
    downloadAvatar,
    deleteTempFile
};
