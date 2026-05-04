const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.yfsp.tv';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
  },
  timeout: 15000
});

/**
 * Scrape movie list from the HTML page
 */
async function getVideoList(cid, page = 1) {
  try {
    // cid 1: Movies, 2: TV
    const url = `/list?cid=${cid}&page=${page}`;
    const res = await apiClient.get(url);
    const $ = cheerio.load(res.data);
    
    const list = [];
    
    // Attempting to find movie cards. Based on common IYF structure:
    // Usually items are within a list container.
    $('.item, .video-item, [clickmode="cpt"]').each((i, el) => {
      const $el = $(el);
      const title = $el.find('.title, .name').text().trim();
      const poster = $el.find('img').attr('src') || $el.find('img').attr('data-src');
      const link = $el.find('a').attr('href');
      
      // Extract ID from link like "/play/Spip8DKPFW7"
      const idMatch = link ? link.match(/\/play\/([a-zA-Z0-9]+)/) : null;
      const id = idMatch ? idMatch[1] : null;

      if (id && title) {
        list.push({
          id: id,
          title: title,
          image: poster ? (poster.startsWith('http') ? poster : BASE_URL + poster) : null
        });
      }
    });

    return { ret: 200, data: { list } };
  } catch (error) {
    console.error('Scraping error:', error.message);
    return { ret: 500, data: { list: [] } };
  }
}

/**
 * Detail fallback (can still try API for detail, as it might be less protected than lists)
 */
async function getVideoDetail(id) {
  try {
    // Detail API might still work even if lists don't
    const res = await axios.get(`https://api.iyf.tv/api/v1/Video/GetModel`, {
      params: { id, t: Math.floor(Date.now() / 1000) },
      headers: { 'User-Agent': USER_AGENT }
    });
    return res.data;
  } catch (error) {
    return { ret: 200, data: { title: 'Unknown', id: id } };
  }
}

module.exports = {
  getRecommendList: (type, page) => getVideoList(type === 1 ? 1 : 2, page),
  getVideoList,
  getVideoDetail
};
