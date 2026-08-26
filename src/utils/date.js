/**
 * Formata uma data no formato brasileiro: DD/MM/YYYY, HH:mm:ss
 * @param {Date} [date=new Date()] 
 * @returns {string}
 */
function formatPrintDate(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    
    // Suporta timezone de São Paulo / Brasil
    const options = {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    try {
        const formatter = new Intl.DateTimeFormat('pt-BR', options);
        return formatter.format(date);
    } catch {
        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1);
        const year = date.getFullYear();
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
    }
}

module.exports = { formatPrintDate };
