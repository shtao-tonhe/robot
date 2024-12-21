
const db = require('../db')
const tablePrefix = db.getTablePrefix()

module.exports = {
    getAllNotes: async () => {
        return await db.query(`SELECT * FROM ${tablePrefix}notes`);
    },
    getLastNote: async () => {
        const [note] = await db.query(`SELECT * FROM ${tablePrefix}notes ORDER BY id DESC LIMIT 1`);
        return note || null;
    },
    getNoteById: async (id) => {
        const [note] = await db.query(`SELECT * FROM ${tablePrefix}notes WHERE id = ?`, [id]);
        return note || null;
    },
    createNote: async (note) => {
        const result = await db.query(
            `INSERT INTO ${tablePrefix}notes (note_id, source_uid) VALUES (?, ?)`,
            [note.noteId, note.uid]
        );
        return { id: result.insertId };
    },
    updateNote: async (id, updates) => {
        const result = await db.query(
            `UPDATE ${tablePrefix}notes SET name = ?, description = ? WHERE id = ?`,
            [updates.name, updates.description, id]
        );
        return { changes: result.affectedRows };
    },
    // 批量创建
    bulkCreateNotes: async (notes) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            if (notes.length > 0) {
                // 验证并过滤掉无效的数据项
                const validNotes = notes.filter(note =>
                    note.noteId !== null &&
                    note.uid !== null &&
                    note.likes !== null);

                if (validNotes.length === 0) {
                    console.warn('No valid notes to insert.');
                    return;
                }

                // 构建批量插入所需的占位符和值数组
                const placeholders = validNotes.map(() => '(?, ?, ?, ?)').join(', ');
                const values = validNotes.flatMap(note => [note.noteId, note.uid, note.likes, note.extend]);

                await connection.query(
                    `INSERT INTO ${tablePrefix}notes (note_id, source_uid, likes, source_extend) VALUES ${placeholders}`,
                    values
                );
            }

            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },
};