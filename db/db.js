const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'robot',
};

// 创建连接池
const pool = mysql.createPool(config);

// 表前缀
const tablePrefix = 'robot_';

module.exports = {
    // 提供一个获取连接的方法
    getConnection: async () => {
        return await pool.getConnection();
    },

    // 普通的查询方法
    query: async (sql, params) => {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(sql, params);
            return rows;
        } finally {
            connection.release(); // 确保连接被释放回池中
        }
    },

    getTablePrefix: () => tablePrefix,
};