const db = require("../db");
const tablePrefix = db.getTablePrefix();

module.exports = {
    getAllLogs: async () => {
        return await db.query(`SELECT * FROM ${tablePrefix}log`);
    },
    createLog: async (log) => {
        const result = await db.query(
            `INSERT INTO ${tablePrefix}logs (source, code, content, create_time, action) VALUES (?, ?, ?, ?, ?)`,
            [log.source, log.code, log.content, log.create_time, log.action]
        );
        return { id: result.insertId };
    },
};
