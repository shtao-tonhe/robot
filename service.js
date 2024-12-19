
const express = require('express')
const cors = require('cors');
const cron = require('node-cron')
const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')

const autoTaskJob = require('./autoTaskJob');


const app = express()
const PORT = 12413

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'data')))


// Data


// Api
// ---重载自动执行任务配置
app.post('/reloadAutoConfig', (req, res) => {
    const reqBody = req.body
    console.log(`重载1`)
    console.log(`重载2: ${reqBody}`)

    res.json({ message: 'auto config reload ok' })
    //文件中记录当前自动执行时间
    // fs

    //调用重载
    new autoTaskJob(
        'reloadConfig',
        { cron: reqBody.cron },
        () => console.log('Task function executed')
    )
})


// 接收任务提交
app.post('/submit-task', (req, res) => {
    const { data } = req.body;
    console.log(`收到任务数据: ${data}`);

    // 在这里可以添加任务到队列或者直接执行任务
    executeTask(data);

    res.json({ message: '任务已提交' });
})

// 读取输出文件
app.get('/read-output', (req, res) => {
    const outputPath = path.join(__dirname, 'output.txt');
    fs.readFile(outputPath, 'utf8', (err, data) => {
        if (err && err.code === 'ENOENT') {
            res.send('');
        } else if (err) {
            res.status(500).send('读取文件时出错');
        } else {
            res.send(data);
        }
    });
})

// 执行任务函数
function executeTask(data) {
    // 模拟任务执行
    console.log(`正在执行任务: ${data}`);

    // 写入文件模拟数据库存储
    const outputPath = path.join(__dirname, 'output.txt');
    fs.appendFile(outputPath, `\n任务数据: ${data}`, (err) => {
        if (err) throw err;
        console.log('任务数据已保存');
    });

    // 这里也可以设置定时任务或其他逻辑
}

// 设置定时任务（如果需要）
cron.schedule('57 16 * * *', () => {
    console.log('定时任务触发时间:', new Date().toLocaleString());
    // 在这里可以放置定时任务逻辑
}, {
    scheduled: true,
    timezone: "Asia/Shanghai"
})

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

