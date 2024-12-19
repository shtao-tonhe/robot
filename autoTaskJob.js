const cron = require('node-cron')

class AutoTaskJob {
    constructor(taskName, taskConfig, taskFunc) {
        console.log('AutoTaskJob init1', taskName, taskConfig, taskFunc)
        this.taskName = taskName
        this.taskConfig = taskConfig
        this.taskFunc = taskFunc
        this.taskJob = null
        console.log('AutoTaskJob init2', this.taskName, this.taskConfig, this.taskFunc)
    }
    // 启动任务
    start() {
        console.log('AutoTaskJob start===============')
        this.taskJob = new cron.CronJob(this.taskConfig.cron, () => {
            this.taskFunc()
        }, null, true, 'Asia/Shanghai')
    }

    // 停止任务
    stop() {
        this.taskJob.stop()
    }
    /**
     * 重新加载配置
     * @param {*} newConfig
     */
    reloadConfig(newConfig) {
        console.log('自动任务配置---1---', newConfig)
        this.taskConfig = newConfig
        console.log('自动任务配置---2----', this.taskConfig)
        // this.stop()
        // this.start()
    }
    getTaskName() {
        return this.taskName
    }
}
module.exports = AutoTaskJob;
