const dayjs = require('dayjs')

const XhsClient = require('./src/index')
const common = require('./common')

let reqSpeed = 1
let lastReqTime

const cookie = 'abRequestId=feac7708-feb5-5881-a671-08bc796b3449; a1=191b0d47914iol06xlty58ohns5oqajtylxos6r7950000951776; webId=f196b09d4218e3fd5b64ce71cc65d978; gid=yjyD8f4Y4yvJyjyD8f4Wj1KFy43l18KC19v2CWjYlxIM2l28lA0V9M888j2yWWK80WDq4iyf; webBuild=4.48.0; xsecappid=xhs-pc-web; web_session=040069b01f8857582649027b50354b8e539b39; unread={%22ub%22:%226760e9030000000014021867%22%2C%22ue%22:%22674065ec0000000006014215%22%2C%22uc%22:29}; acw_tc=0a4a7a1b17346881597361592e35c89aabd02c8d9500e8823156956c09630b; websectiga=3fff3a6f9f07284b62c0f2ebf91a3b10193175c06e4f71492b60e056edcdebb2; sec_poison_id=152eef44-54a5-43ba-b442-e3c464d332e0';
const oldCookie = 'abRequestId=6a42c3f7-5f4c-572e-9847-bc733cc61073; a1=18f74e3b0e2m6jaraiqcaajn8bmz3765wou17xhp030000156562; webId=6cf889e2d027fb9172e3e69efc3394dc; gid=yYiW4dqDYiEJyYiW4dqD8lCxdJ6KV0F03AS07U80VIYD6yq8uqWK2W888y2K2KJ8K8JJKiYi; web_session=040069799389ab765b50575be0344b9d3c063b; customer-sso-sid=68c517410666572733120337df34ff2b8bc1aac1; x-user-id-creator.xiaohongshu.com=5ef20f0f000000000100483a; customerClientId=965656639764280; access-token-creator.xiaohongshu.com=customer.creator.AT-68c517410666577028087634yjkb5nvv6t2bnb14; galaxy_creator_session_id=LLUI5RgXpnMwRDhSjFKsVVYihXban6SgJrqJ; galaxy.creator.beaker.session.id=1725430269055031096045; xsecappid=xhs-pc-web; webBuild=4.33.2; acw_tc=516c79762347783762729be84a3278a50c63269cd67f21690139e726ddee98c2; websectiga=7750c37de43b7be9de8ed9ff8ea0e576519e8cd2157322eb972ecb429a7735d4; sec_poison_id=d8892cdd-5821-4891-8304-217ab4821b93; unread={%22ub%22:%2266d9e6bf0000000025033c16%22%2C%22ue%22:%2266da5a9a00000000250307c3%22%2C%22uc%22:29}';

const client = new XhsClient({
  cookie: cookie
})

const db = require('./db/db');
const userM = require('./db/models/user')
const noteM = require('./db/models/note')

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

function test_getNoteById() {
  const noteId = '66d90590000000001f01fe31';
  client.getNoteById(noteId).then(async res => {
    console.log('笔记数据:', res);
    await common.writeJsonToFile('./data/getNoteById.json', res);
  })
}
// test_getNoteById()

function test_getNoteByIdFromHtml() {
  const client = new XhsClient({
    cookie: cookie
  });
  const noteId = '66d90590000000001f01fe31';
  client.getNoteByIdFromHtml(noteId).then(res => {
    console.log('笔记数据:', res)
  })
}
// test_getNoteByIdFromHtml()


// 在事务中批量插入笔记和用户数据
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
testSearchNote()

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



//获取指定用户的笔记列表
async function testGetUserNotes() {
  const client = new XhsClient({
    cookie: cookie
  });
  const noteId = '66f14967000000001d021c2d';
  const result = await client.getUserNotes( noteId );
  console.log('获取用户笔记列表:', result);

  // 写入文件
  // await common.writeJsonToFile('./data/userNoteList.json', result);
}
// testGetUserNotes()

//获取指定用户的笔记列表
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



