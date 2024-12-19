const fs = require('fs').promises;
const path = require('path');

const common = {
  // 将 JSON 数据写入文件
  async writeJsonToFile(filePath, data) {
    try {
      // 确保文件路径为绝对路径
      const fullPath = path.resolve(filePath);

      // 将对象转换为 JSON 字符串
      const jsonData = JSON.stringify(data, null, 2);

      // 异步写入文件
      await fs.writeFile(fullPath, jsonData, 'utf-8');
      console.log(`Successfully wrote data to ${fullPath}`);
    } catch (error) {
      console.error('Error writing to file:', error);
    }
  },

  // 从文件中读取 JSON 数据
  async readJsonFromFile(filePath) {
    try {
      const fullPath = path.resolve(filePath);

      // 读取文件内容
      const data = await fs.readFile(fullPath, 'utf-8');

      // 将文件内容解析为对象
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading from file:', error);
      return null; // 如果发生错误，返回 null
    }
  },

  // 写入普通文本文件
  async writeTextToFile(filePath, text) {
    try {
      const fullPath = path.resolve(filePath);
      await fs.writeFile(fullPath, text, 'utf-8');
      console.log(`Successfully wrote text to ${fullPath}`);
    } catch (error) {
      console.error('Error writing text to file:', error);
    }
  },

  // 读取普通文本文件
  async readTextFromFile(filePath) {
    try {
      const fullPath = path.resolve(filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      console.error('Error reading text from file:', error);
      return null;
    }
  }
};

module.exports = common;
