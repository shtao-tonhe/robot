const axios = require('axios')
const qs = require('querystring')
const { get_xs } = require('./jsvmp/xhs')
const dayjs = require('dayjs')
const {
  getXCommon,
  getSearchId,
  SearchSortType,
  SearchNoteType
} = require('./help')
const {
  ErrorEnum,
  DataFetchError,
  IPBlockError,
  SignError,
  NeedVerifyError
} = require('./exception')

const {
  setLog
} = require('../util')



class XhsClient {
  constructor({
    cookie = null,
    userAgent = null,
    timeout = 10000,
    proxies = null,
  } = {}) {
    this.proxies = proxies;
    this.timeout = timeout;
    this._host = "https://edith.xiaohongshu.com";
    this._creatorHost = "https://creator.xiaohongshu.com";
    this._customerHost = "https://customer.xiaohongshu.com";
    this.home = "https://www.xiaohongshu.com";
    this.userAgent = userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36";

    this.axiosInstance = axios.create({
      timeout: this.timeout,
      headers: {
        'user-agent': this.userAgent,
        'Content-Type': 'application/json',
      },
    });

    if (cookie) {
      this.cookie = cookie;
    }
  }

  // Getter for cookie
  get cookie() {
    return this.axiosInstance.defaults.headers.Cookie;
  }

  // Setter for cookie
  set cookie(cookie) {
    this.axiosInstance.defaults.headers.Cookie = cookie;
  }

  // Getter for cookieDict
  get cookieDict() {
    const cookieStr = this.axiosInstance.defaults.headers.Cookie;
    return cookieStr ? qs.parse(cookieStr.replace(/; /g, '&')) : {};
  }

  _preHeaders(url, data = null) {
    let a1 = this.cookieDict.a1;
    let b1 = ""
    let x_s_result = get_xs(url, data, this.cookie);
    const X_S = x_s_result['X-s']
    const X_t = x_s_result['X-t'].toString()
    const X_S_COMMON = getXCommon(a1, b1, X_S, X_t)
    this.axiosInstance.defaults.headers['X-s'] = X_S
    // this.axiosInstance.defaults.headers['X-t'] = X_t
    // this.axiosInstance.defaults.headers['X-s-common'] = X_S_COMMON
  }

  async request(method, url, config = {}) {
    try {
      const response = await this.axiosInstance({ method, url, ...config });
      console.log('req-confgig-----------', response)
      if (!response.data) return response;

      const data = response.data;
      // console.log('---api---data---',data)
      setLog(url,  response.config.data, response.status)
      if (data.success) {
        return data.data || data.success;
      } else if (data.code === ErrorEnum.IP_BLOCK.code) {
        throw new IPBlockError(ErrorEnum.IP_BLOCK.msg, response);
      } else if (data.code === ErrorEnum.SIGN_FAULT.code) {
        throw new SignError(ErrorEnum.SIGN_FAULT.msg, response);
      } else {
        return { 'error': '10086' }
        // throw new DataFetchError(data, response);
      }
    } catch (error) {
      // console.log('---api---error---',error)
      setLog(url,  error.response.config.data, error.response.status)
      throw error;
    }
  }


  async testGet() {
    const uri = "/api/sns/web/v2/comment/page"
    const params = {
      "note_id": 123,
      "cursor": 456,
    }
    return this.post(uri, params);
  }

  async get(uri, params = null, isCreator = false, isCustomer = false, config = {}) {
    await setLog({uri:uri, data:params})
    let finalUri = uri;
    if (params) {
      finalUri = `${uri}?${qs.stringify(params)}`;
    }
    this._preHeaders(finalUri, null);
    let endpoint = this._host;
    if (isCustomer) {
      endpoint = this._customerHost;
    } else if (isCreator) {
      endpoint = this._creatorHost;
    }
    return this.request('GET', `${endpoint}${finalUri}`, config);
  }

  async post(uri, data = null, isCreator = false, isCustomer = false, config = {}) {
    await setLog({uri:uri, data:data})
    let jsonStr = data ? JSON.stringify(data) : null;
    this._preHeaders(uri, data);
    let endpoint = this._host;
    if (isCustomer) {
      endpoint = this._customerHost;
    } else if (isCreator) {
      endpoint = this._creatorHost;
    }
    if (data) {
      return this.request('POST', `${endpoint}${uri}`, {
        ...config,
        data: jsonStr,
        headers: {
          ...config.headers,
          'Content-Type': 'application/json',
        }
      });
    }
    return this.request('POST', `${endpoint}${uri}`, { ...config, data });
  }

  /**
   * 获取笔记详情
   * @param {string} noteId
   * @returns
   */
  async getNoteById(noteId) {
    const data = {
      source_note_id: noteId,
      image_scenes: ["CRD_WM_WEBP"]
    };
    const uri = "/api/sns/web/v1/feed";

    try {
      const res = await this.post(uri, data);
      return res.items[0].note_card;
    } catch (error) {
      console.error("Error fetching note:", error);
      throw error;
    }
  }

  async getNoteByIdFromHtml(noteId) {
    const camelToUnderscore = (key) => {
      return key.replace(/([A-Z])/g, "_$1").toLowerCase();
    };

    const transformJsonKeys = (jsonData) => {
      const dataDict = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const dictNew = {};
      for (const [key, value] of Object.entries(dataDict)) {
        const newKey = camelToUnderscore(key);
        if (!value) {
          dictNew[newKey] = value;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          dictNew[newKey] = transformJsonKeys(value);
        } else if (Array.isArray(value)) {
          dictNew[newKey] = value.map(item =>
            item && typeof item === 'object' ? transformJsonKeys(item) : item
          );
        } else {
          dictNew[newKey] = value;
        }
      }
      return dictNew;
    };

    const url = `https://www.xiaohongshu.com/explore/${noteId}`;
    try {
      const response = await this.axiosInstance.get(url, {
        headers: {
          'user-agent': this.userAgent,
          'referer': 'https://www.xiaohongshu.com/'
        }
      });

      const html = response.data;
      const stateMatch = html.match(/window.__INITIAL_STATE__=({.*})<\/script>/);

      if (stateMatch) {
        const state = stateMatch[1].replace(/undefined/g, '""');
        if (state !== "{}") {
          const noteDict = transformJsonKeys(JSON.parse(state));
          return noteDict.note.note_detail_map[noteId].note;
        }
      }

      if (html.includes(ErrorEnum.IP_BLOCK.value)) {
        throw new IPBlockError(ErrorEnum.IP_BLOCK.value);
      }

      throw new DataFetchError(html);
    } catch (error) {
      console.error("Error fetching note:", error);
      throw error;
    }
  }

  async getSelfInfo() {
    const uri = "/api/sns/web/v1/user/selfinfo";
    return this.get(uri);
  }

  async getSelfInfoV2() {
    const uri = "/api/sns/web/v2/user/me";
    return this.get(uri);
  }

  async getUserInfo(userId) {
    const uri = '/api/sns/web/v1/user/otherinfo'
    const params = {
      "target_user_id": userId
    }
    return this.get(uri, params);
  }

  /**
   * 搜索笔记
   * @param {string} keyword 关键词
   * @param {number} page 页码
   * @param {number} pageSize 分页查询的数量
   * @param {string} sort 搜索的类型,分为: general, popularity_descending, time_descending
   * @param {number} noteType 笔记类型
   * @returns
   */
  async getNoteByKeyword(
    keyword,
    page = 1,
    pageSize = 20,
    sort = SearchSortType.GENERAL,
    noteType = SearchNoteType.ALL
  ) {
    const uri = "/api/sns/web/v1/search/notes";
    const data = {
      keyword: keyword,
      page: page,
      page_size: pageSize,
      search_id: getSearchId(),
      sort: sort.value,
      note_type: noteType.value,
      image_formats: ["jpg", "webp", "avif"],
      ext_flags: [],
    };

    return this.post(uri, data);
  }

  /**
   * 相关搜索热词
   * @param {*} keyword
   * @returns
   */
  async getNoteByKeywordV2(
    keyword,
  ) {
    const uri = "/api/sns/web/v1/search/filters";
    const data = {
      keyword: keyword,
      search_id: getSearchId(),
    };

    return this.get(uri, data);
  }

  /**
   * 获取笔记评论
   * @param {string} noteId 笔记id
   * @param {string} xsec_token 笔记token
   * @param {string} cursor 分页查询的下标,默认为""
   * @returns
   */
  async getNoteComments(noteId, xsec_token, cursor = "") {
    const uri = "/api/sns/web/v2/comment/page"
    const params = {
      "note_id": noteId,
      "cursor": cursor,
      "top_comment_id": "",
      "image_formats": "jpg,webp,avif",
      "xsec_token": xsec_token
    }
    return this.get(uri, params);
  }

  /**
   * 添加评论
   * @param {string} noteId 笔记id
   * @param {string} target_comment_id 目标评论id
   * @param {string} content 评论的内容
   * @returns
   */
  async addNoteComment(noteId, target_comment_id, content ) {
    if( !noteId || !content ) return;

    const uri = "/api/sns/web/v1/comment/post"
    const params = {
      "note_id": noteId,
      "content": content,
      "at_users": []
    }
    if( target_comment_id ) params.target_comment_id = target_comment_id
    const res = await this.post(uri, params)
    console.log('添加评论--controller---', res)
    return res
  }

  /**
   * 获取用户笔记
   * @param {*} userId
   * @param {*} num
   * @param {*} cursor
   * @returns
   */
  async getUserNotes(userId, num=5, cursor = "") {
    const uri = "/api/sns/web/v1/user_posted"
    const params = {
      "cursor": cursor,
      "num": num,
      "user_id": userId,
      "image_scenes": "FD_WM_WEBP"
    }
    return this.get(uri, params);
  }

  /**
   * 获取账号@我通知
   * @param {*} num
   * @param {*} cursor
   * @returns
   */
  async getMentionNotifications(num = 20, cursor = "") {
    const uri = "/api/sns/web/v1/you/mentions"
    const params = { "num": num, "cursor": cursor }
    return this.get(uri, params);
  }

  /**
   * 获取点赞通知
   * @param {*} num
   * @param {*} cursor
   * @returns
   */
  async getLikeNotifications(num = 20, cursor = "") {
    const uri = "/api/sns/web/v1/you/likes"
    const params = { "num": num, "cursor": cursor }
    return this.get(uri, params);
  }

  /**
   * 获取关注通知
   * @param {*} num
   * @param {*} cursor
   * @returns
   */
  async getFollowNotifications(num = 20, cursor = "") {
    const uri = "/api/sns/web/v1/you/connections"
    const params = { "num": num, "cursor": cursor }
    return this.get(uri, params);
  }
}



module.exports = XhsClient;


// 分页加载评论
// https://edith.xiaohongshu.com/api/sns/web/v2/comment/sub/page?note_id=6718944a000000001402c5c1&root_comment_id=67192cfb000000001b000d0b&num=10&cursor=67192f70000000001b024fdc&image_formats=jpg,webp,avif&top_comment_id=&xsec_token=ABoN5f9DcACpadUYtZlCU-zCjLLoWaFq1ZViP_1wdZJuo%3D