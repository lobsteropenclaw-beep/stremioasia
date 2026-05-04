const axios = require('axios');

const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

const apiClient = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'zh-CN' // Get metadata in Chinese where available
  }
});

/**
 * Discover content from specific Asian countries
 * Countries: KR (Korea), CN (China), JP (Japan), HK (Hong Kong), TW (Taiwan)
 */
async function discover(type, countries, page = 1) {
  if (!API_KEY) return { results: [] };
  
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  try {
    const res = await apiClient.get(endpoint, {
      params: {
        with_origin_country: countries.join('|'),
        sort_by: 'popularity.desc',
        page: page
      }
    });
    return res.data;
  } catch (err) {
    console.error('TMDb Error:', err.message);
    return { results: [] };
  }
}

async function getDetails(type, id) {
  if (!API_KEY) return null;
  const endpoint = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;
  try {
    const res = await apiClient.get(endpoint, {
      params: { append_to_response: 'credits,videos' }
    });
    return res.data;
  } catch (err) {
    return null;
  }
}

module.exports = {
  discover,
  getDetails
};
