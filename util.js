
const dayjs = require('dayjs')
const logM = require('./db/models/log')

async function setLog( uri, data, code ){
    const reqData = {uri: uri, data:data}
    const logMData = {
        source: 1,
        code: code || -1,
        content: JSON.stringify(reqData),
        create_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        action: code === 0 ? 0 : ( code ? 2 : 1 ),
    }
    await logM.createLog(logMData)
    return true
}

module.exports = { setLog }

