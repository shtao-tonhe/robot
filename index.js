const dayjs = require('dayjs')

const XhsClient = require('./src/index')
const common = require('./common')

let reqSpeed = 1
let lastReqTime

const cookie = 'abRequestId=b0f72f00-c169-5060-b6a1-1846373b6d39; xsecappid=xhs-pc-web; a1=192b465edda3ko02nyoawbo2ca38uqtkl205ks2l530000361395; webId=eb1c6f7c26c0ccfe413e0fd0bf26df8b; gid=yjJD4K2i4d1JyjJD4K2dfJMJf0qTl8JIvl0E812DlJS0q2q8Y7A9TT888qKyqj28qq8484fD; webBuild=4.48.0; acw_tc=0a50895617347155409792527eec71aa04c4d2b0a899ea69c7ddaf183f7900; web_session=040069b01f8857582649cce050354bab93a1b8';

const client = new XhsClient({
  cookie: cookie
})

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
async function getNoteComments() {
  if (!await checkReqTime()) return false

  try {
    const noteId = '67623e81000000000800d41e';
    const reqResult = await client.getNoteComments(noteId)
    console.log('帖子评论--:', reqResult)

    if (reqResult.error && reqResult.error === 10086) return false

    // 最外层的评论 不算回复
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
getNoteComments()


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
  const keyword = '哈尔滨'

  try {
    const reqResult = await client.getNoteByKeyword(keyword)
    console.log('搜索结果1--:', reqResult)

    if (reqResult.error && reqResult.error === 10086) return false

    if (reqResult.items.length > 0) {
      // 收集需要插入的数据
      const notesData = []
      const usersData = []

      for (const note of reqResult.items) {
        if (
          note.id &&
          note.note_card &&
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


//获取指定用户的帖子列表
async function testGetNoteComments() {
  const client = new XhsClient({
    cookie: cookie
  });
  const noteId = '6718944a000000001402c5c1';
  const result = await client.getNoteComments( noteId );

  // 写入文件
  await common.writeJsonToFile('./data/noteComments.json', result);
}
// testGetNoteComments()


//添加评论
async function testAddNoteComment() {
  const client = new XhsClient({
    cookie: cookie
  });
  const noteId = '6718944a000000001402c5c1'; //帖子ID
  const target_comment_id = '67192f70000000001b024fdc';//需要回复的评论ID
  const content = '现在主播很多的吧？';//回复内容
  const at_users = [];//@的用户
  const result = await client.addNoteComment( noteId, target_comment_id, content);

  // 写入文件
  await common.writeJsonToFile('./data/addNoteComment.json', result);
}
// testAddNoteComment()



