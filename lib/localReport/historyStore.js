//@ts-check

const fs = require('fs');
const path = require('path');

/**
 * @param {{ storagePath: string }} options
 */
function createHistoryStore(options) {
    const storagePath = options && options.storagePath ? options.storagePath : '';
    const historyDir = path.join(storagePath, 'history');
    const historyFilePath = path.join(historyDir, 'activity.jsonl');

    async function appendMany(events) {
        if (!Array.isArray(events) || events.length === 0) return;
        fs.mkdirSync(historyDir, { recursive: true });
        const lines = events
            .filter(event => event && typeof event === 'object')
            .map(event => JSON.stringify(event))
            .join('\n');
        if (!lines) return;
        await fs.promises.appendFile(historyFilePath, `${lines}\n`, 'utf8');
    }

    async function readAll() {
        if (!fs.existsSync(historyFilePath)) return [];
        return fs.readFileSync(historyFilePath, 'utf8')
            .split('\n')
            .filter(Boolean)
            .flatMap(line => {
                try {
                    return [JSON.parse(line)];
                } catch (_) {
                    return [];
                }
            });
    }

    async function readReportEvents() {
        const records = await readAll();
        return records.filter(record => Number(record.long) > 0 && Number(record.time) > 0);
    }

    async function clear() {
        if (!fs.existsSync(historyFilePath)) return;
        await fs.promises.rm(historyFilePath, { force: true });
    }

    async function takeReportEvents() {
        const records = await readReportEvents();
        await clear();
        return records;
    }

    return {
        appendMany,
        readAll,
        readReportEvents,
        clear,
        takeReportEvents,
        historyFilePath
    };
}

module.exports = {
    createHistoryStore
};
