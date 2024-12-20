
const db = require('../db')
const tablePrefix = db.getTablePrefix()

module.exports = {
  getAllReplys: async () => {
    return await db.query(`SELECT * FROM ${tablePrefix}note_reply`);
  },
  getReplyById: async (id) => {
    const [note] = await db.query(`SELECT * FROM ${tablePrefix}note_reply WHERE id = ?`, [id]);
    return note || null;
  },
  createReply: async (note) => {
    const result = await db.query(
      `INSERT INTO ${tablePrefix}note_reply (reply_id, note_id, target_id, content) VALUES (?, ?, ?, ?)`,
      [note.replyId, note.noteId, note.targetId, note.content]
    );
    return { id: result.insertId };
  },
  updateReply: async (id, updates) => {
    const result = await db.query(
      `UPDATE ${tablePrefix}note_reply SET name = ?, description = ? WHERE id = ?`,
      [updates.name, updates.description, id]
    );
    return { changes: result.affectedRows };
  },
  // 批量创建
  bulkCreateReplys: async (replys) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      if (replys.length > 0) {

        if (replys.length === 0) {
          console.warn('No valid replys to insert.');
          return;
        }

        // 构建批量插入所需的占位符和值数组
        const placeholders = replys.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const values = replys.flatMap(note => [note.replyId, note.userId, note.noteId, note.targetId, note.content]);

        await connection.query(
          `INSERT INTO ${tablePrefix}note_reply (reply_id, source_uid, note_id, target_id, content) VALUES ${placeholders}`,
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