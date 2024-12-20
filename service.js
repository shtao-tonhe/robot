
const express = require('express')
const cors = require('cors')
const cron = require('node-cron')
const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')
const NodeCache = require('node-cache')


// 未设置过期时间
// |----- 过期60s，每10s检查过期项  { stdTTL: 60, checkperiod: 10 }
let appCache = new NodeCache()

const autoTaskJob = require('./autoTaskJob')

const userM = require('./db/models/user')
const noteM = require('./db/models/note')

const {
    setLog
} = require('./util')


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
    console.log(`Server is running on http://localhost:${PORT}`);
    setLog(0,0,0)
    init()
});

// init函数
async function init() {
    //1、从db获取全局配置
    //2、写入cache
    //3、初始化定时任务
    // const globalConfig = await db.getGlobalConfig()
}

