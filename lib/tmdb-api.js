const axios = require('axios');

const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

const apiClient = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'zh-CN' // Get metadata in Chinese
  }
});

/**
 * Discover content from specific Asian languages and countries
 */
async function discover(type, countries, languages, page = 1, genreId = null) {
  if (!API_KEY) return { results: [] };
  
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  try {
    const res = await apiClient.get(endpoint, {
      params: {
        with_origin_country: countries.join('|'),
        with_original_language: languages.join('|'),
        with_genres: genreId,
        sort_by: 'popularity.desc',
        'vote_count.gte': 10,
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
      params: { append_to_response: 'credits,videos,external_ids' }
    });
    return res.data;
  } catch (err) {
    return null;
  }
}

async function getSeasonDetails(tvId, seasonNumber) {
  if (!API_KEY) return null;
  try {
    const res = await apiClient.get(`/tv/${tvId}/season/${seasonNumber}`);
    return res.data;
  } catch (err) {
    return null;
  }
}

module.exports = {
  discover,
  getDetails,
  getSeasonDetails
};
