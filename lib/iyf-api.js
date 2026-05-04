const axios = require('axios');

const BASE_URL = 'https://api.iyf.tv/api/v1';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.yfsp.tv',
    'Referer': 'https://www.yfsp.tv/'
  },
  timeout: 10000
});

/**
 * Get recommended content list (Home/Featured)
 */
async function getRecommendList(type = 0, page = 1, size = 30) {
  try {
    const response = await apiClient.get('/Recommend/GetList', {
      params: { type, page, size, t: Math.floor(Date.now() / 1000) }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching recommend list:', error.message);
    return null;
  }
}

/**
 * Get video list by category
 */
async function getVideoList(cid, page = 1, pageSize = 30) {
  try {
    const response = await apiClient.get('/Video/GetList', {
      params: { cid, page, pageSize, orderBy: 'latest', desc: 1, t: Math.floor(Date.now() / 1000) }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching video list:', error.message);
    return null;
  }
}

/**
 * Get detailed metadata for a video
 */
async function getVideoDetail(id) {
  try {
    const response = await apiClient.get('/Video/GetModel', {
      params: { id, t: Math.floor(Date.now() / 1000) }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching video detail:', error.message);
    return null;
  }
}

module.exports = {
  getRecommendList,
  getVideoList,
  getVideoDetail
};
