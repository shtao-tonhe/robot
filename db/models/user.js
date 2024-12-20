
const db = require('../db');
const tablePrefix = db.getTablePrefix();

module.exports = {
    getAllUsers: async () => {
        return await db.query(`SELECT * FROM ${tablePrefix}users`);
    },
    getUserById: async (id) => {
        const [user] = await db.query(`SELECT * FROM ${tablePrefix}users WHERE id = ?`, [id]);
        return user || null;
    },
    createUser: async (user) => {
        const result = await db.query(
            `INSERT INTO ${tablePrefix}users (source_uid) VALUES (?)`,
            [user.source_uid]
        );
        return { id: result.insertId };
    },
    updateUser: async (id, updates) => {
        const result = await db.query(
            `UPDATE ${tablePrefix}users SET source_uid = ? WHERE id = ?`,
            [updates.source_uid, id]
        );
        return { changes: result.affectedRows };
    },
    deleteUser: async (id) => {
        const result = await db.query(`DELETE FROM ${tablePrefix}users WHERE id = ?`, [id]);
        return { changes: result.affectedRows };
    },
    // 批量创建
    bulkCreateUsers: async (users) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            if (users.length > 0) {
                const placeholders = users.map(() => '(?)').join(', ');
                const values = users.map(user => user.uid);

                await connection.query(
                    `INSERT INTO ${tablePrefix}users (source_uid) VALUES ${placeholders}`,
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