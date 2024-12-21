const dayjs = require('dayjs')

const XhsClient = require('./src/index')
const common = require('./common')

let reqSpeed = 1
let lastReqTime

const cookie = 'abRequestId=feac7708-feb5-5881-a671-08bc796b3449; a1=191b0d47914iol06xlty58ohns5oqajtylxos6r7950000951776; webId=f196b09d4218e3fd5b64ce71cc65d978; gid=yjyD8f4Y4yvJyjyD8f4Wj1KFy43l18KC19v2CWjYlxIM2l28lA0V9M888j2yWWK80WDq4iyf; xsecappid=xhs-pc-web; webBuild=4.48.0; websectiga=984412fef754c018e472127b8effd174be8a5d51061c991aadd200c69a2801d6; sec_poison_id=7974ab5d-6401-4dc3-b45e-c0b84f0b2eb5; acw_tc=0a4add3517347475390975529ebb135a4e94f1c5f4a4249f07a593179f62ba; web_session=040069b01f8857582649ca6d53354b23813bbb';

const client = new XhsClient({
  cookie: cookie
})

const {
  setDesc
} = require('./util')

const db = require('./db/db');
const userM = require('./db/models/user')
const noteM = require('./db/models/note')
const replyM = require('./db/models/reply')

async function checkReqTime(){
  return new Promise((resolve, reject) => {
    if( !lastReqTime ) resolve(true)
    const now = dayjs().unix()
    if (now - lastReqTime > reqSpeed) {
      resolve(true)
    } else {
      setTimeout(() => {
        resolve(true)
      }, reqSpeed - (now - lastReqTime))
    }
  })
}

// 在事务中批量插入帖子评论
async function insertNoteReplys(replysData, usersData) {
  const connection = await db.getConnection();
  try {
      await connection.beginTransaction();

      if (replysData.length > 0) {
        await replyM.bulkCreateReplys(replysData, connection);
      }

      await connection.commit();
  } catch (err) {
      await connection.rollback();
      throw err;
  } finally {
      connection.release();
  }
}
//获取帖子评论【一级】
async function getNoteComments() {
  if (!await checkReqTime()) return false

  try {
    const lastNote = await noteM.getLastNote()
    console.log('最后帖子1id--:', lastNote)
    console.log('最后帖子0id--:', typeof(lastNote))
    if (!lastNote || !lastNote.note_id) {
      setDesc('获取帖子评论---没有找到帖子--无法获取')
      return false
    }

    const extendData = JSON.parse(lastNote.source_extend)

    const reqResult = await client.getNoteComments(lastNote.note_id, extendData.xsec_token)

    if (reqResult.error && reqResult.error === 10086) return false

    // 最外层的评论 没考虑不算子级回复的
    if (reqResult.comments.length > 0) {
      const replysData = []

      // 回复内容数量
      // sub_comment_count

      for (const reply of reqResult.comments) {
        if (
          reply.id &&
          reply.user_info &&
          reply.note_id &&
          reply.content
        ) {
          replysData.push({
            replyId: reply.id,
            userId: reply.user_info.user_id,
            noteId: reply.note_id,
            targetId: reply.note_id,
            content: reply.content,
            createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          })
        }
      }

      // 使用事务批量插入数据
      await insertNoteReplys(replysData)
    }
  } catch (error) {
    console.error('Error processing search results:', error)
  }
}
// getNoteComments()


async function getNoteById() {
  if (!await checkReqTime()) return false

  try {
    const noteId = '6756bb6200000000010286ab';
    const reqResult = await client.getNoteById(noteId)
    console.log('帖子详情--:', reqResult)

    if (reqResult.error && reqResult.error === 10086) return false

    if (reqResult.length > 0) {
      const replysData = []

      // for (const reply of reqResult.items) {
      //   if (
      //     reply.id
      //   ) {
      //     replysData.push({
      //       noteId: note.id,
      //       uid: note.note_card.user.user_id,
      //       likes: note.note_card.interact_info.liked_count,
      //     })
      //   }
      // }

      // 使用事务批量插入数据
      // await insertNoteReplys(replysData)
    }
  } catch (error) {
    console.error('Error processing search results:', error)
  }
}
// getNoteById()

function test_getNoteByIdFromHtml() {
  const client = new XhsClient({
    cookie: cookie
  });
  const noteId = '66d90590000000001f01fe31';
  client.getNoteByIdFromHtml(noteId).then(res => {
    console.log('帖子数据:', res)
  })
}
// test_getNoteByIdFromHtml()


// 在事务中批量插入帖子和用户数据
async function insertNotesAndUsers(notesData, usersData) {
  const connection = await db.getConnection();
  try {
      await connection.beginTransaction();

      if (notesData.length > 0) {
        await noteM.bulkCreateNotes(notesData, connection);
      }

      if (usersData.length > 0) {
        await userM.bulkCreateUsers(usersData, connection);
      }

      await connection.commit();
  } catch (err) {
      await connection.rollback();
      throw err;
  } finally {
      connection.release();
  }
}
async function testSearchNote() {
  if (!await checkReqTime()) return false
  const keyword = '健身'

  try {
    const reqResult = await client.getNoteByKeyword(keyword)
    console.log('搜索结果1--:', reqResult)

    if (reqResult.error && reqResult.error === 10086){
      setDesc('搜索帖子失败')
      return false
    }

    if (reqResult.items.length > 0) {
      setDesc(`搜索帖子成功--共计：${reqResult.items.length}条`)
      // 收集需要插入的数据
      const notesData = []
      const usersData = []

      for (const note of reqResult.items) {
        if (
          note.id &&
          note.note_card &&
          note.xsec_token &&
          note.note_card.user &&
          note.note_card.user.user_id &&
          note.note_card.user.nickname &&
          note.note_card.interact_info.liked_count
        ) {
          console.log('单帖--作品id--:', note.id);
          console.log('单帖--用户id--:', note.note_card.user.user_id);
          notesData.push({
            noteId: note.id,
            uid: note.note_card.user.user_id,
            likes: note.note_card.interact_info.liked_count,
            extend: JSON.stringify({
              xsec_token: note.xsec_token
            }),
          })

          usersData.push({
            noteId: note.id,
            uid: note.note_card.user.user_id,
            username: note.note_card.user.nickname,
          })
        }
      }

      // 使用事务批量插入数据
      await insertNotesAndUsers(notesData, usersData)
    }
  } catch (error) {
    setDesc('搜索帖子失败')
    console.error('Error processing search results:', error)
  }
}
// testSearchNote()

//获取相关热词
async function getHotrKeyWord() {
  if( !await checkReqTime() ) return false
  const keyword = '哈尔滨'

  const reqResult = await client.getNoteByKeywordV2(
    keyword,
  )

  console.log('搜索结果1--:', reqResult)

  if( reqResult.error && reqResult.error === 10086 ) return false

  if( reqResult.items.length > 0 ) {
    // 相似热词
  }
}

//获取指定用户的帖子列表
async function testGetUserNotes() {
  const client = new XhsClient({
    cookie: cookie
  });
  const noteId = '66f14967000000001d021c2d';
  const result = await client.getUserNotes( noteId );
  console.log('获取用户帖子列表:', result);

  // 写入文件
  // await common.writeJsonToFile('./data/userNoteList.json', result);
}
// testGetUserNotes()


//发布评论
async function addNoteComment() {
  try{
    const lastNote = await noteM.getLastNote()
    console.log('最后帖子1id--:', lastNote)

    if (!lastNote || !lastNote.note_id) {
      setDesc('获取帖子评论---没有找到帖子--无法获取')
      return false
    }

    //帖子ID
    const noteId = lastNote.note_id

    // 回复评论ID
    const target_comment_id = null

    //评论内容
    const content = '24要结束了'

    //@的用户
    const at_users = []
    const apiRes = await client.addNoteComment( noteId, target_comment_id, content)

    console.log('Api---发布评论--:', apiRes)

    if( !apiRes || (apiRes.error && apiRes.error === 10086) ){
      setDesc('发布评论失败')
      return false
    }else{
      setDesc('发布评论成功')
      const replysData= []
      replysData.push({
        replyId: apiRes.comment.id,
        userId: apiRes.comment.user_info.user_id,
        noteId: lastNote.note_id,
        targetId: lastNote.note_id,
        content: content,
        createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      })
      await insertNoteReplys(replysData)
    }
  } catch (error) {
    setDesc('添加评论失败')
    console.error('Error processing search results:', error)
  }
}
// addNoteComment()



