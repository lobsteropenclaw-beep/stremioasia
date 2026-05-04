const axios = require('axios');

const BASE_URL = 'https://api.iyf.tv/api/v1'; // Reverting to v1 as it's more stable for discovery
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Origin': 'https://www.yfsp.tv',
    'Referer': 'https://www.yfsp.tv/'
  },
  timeout: 10000
});

/**
 * Get video list with retry logic for 202 errors
 */
async function getVideoList(cid, page = 1, pageSize = 40) {
  const fetchList = async (attempt = 1) => {
    try {
      const response = await apiClient.get('/Video/GetList', {
        params: { cid, page, pageSize, orderBy: 'latest', desc: 1, t: Math.floor(Date.now() / 1000) }
      });
      
      // If we get 202, it might be a temporary "preparing" state
      if (response.data && response.data.ret === 202 && attempt < 3) {
        console.log(`API returned 202, retrying attempt ${attempt}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchList(attempt + 1);
      }
      
      return response.data;
    } catch (error) {
      console.error('API Error:', error.message);
      return null;
    }
  };

  return fetchList();
}

async function getVideoDetail(id) {
  try {
    const response = await apiClient.get('/Video/GetModel', {
      params: { id, t: Math.floor(Date.now() / 1000) }
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

module.exports = {
  getRecommendList: (type, page) => getVideoList(type === 1 ? 1 : 2, page),
  getVideoList,
  getVideoDetail
};
