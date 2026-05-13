const { addonBuilder } = require('stremio-addon-sdk');
const tmdb = require('./tmdb-api');

const manifest = {
  id: 'community.stremio.asian-discovery-v10',
  version: '10.0.0',
  name: 'Asian Discovery ULTIMATE (Restored)',
  description: 'Premium Korean, Chinese, Japanese, and Thai catalogs. Full metadata and scraper support.',
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  catalogs: [
    // --- SPECIALS ---
    { type: 'series', id: 'asian_global_hits', name: '💎 Asian Global Hits' },
    { type: 'series', id: 'asian_new_arrivals', name: '🆕 Just Released' },
    // --- TV SHOWS (SERIES) ---
    { type: 'series', id: 'asian_drama_kr', name: '🇰🇷 Korean Dramas' },
    { type: 'series', id: 'asian_drama_cn', name: '🇨🇳 Chinese Dramas' },
    { type: 'series', id: 'asian_drama_jp', name: '🇯🇵 Japanese Shows' },
    { type: 'series', id: 'asian_drama_th', name: '🇹🇭 Thai Dramas' },
    // --- MOVIES ---
    { type: 'movie', id: 'asian_movie_kr', name: '🇰🇷 Korean Movies', extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama'], isRequired: false }] },
    { type: 'movie', id: 'asian_movie_cn', name: '🇨🇳 Chinese Movies', extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama'], isRequired: false }] },
    { type: 'movie', id: 'asian_movie_jp', name: '🇯🇵 Japanese Movies', extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama'], isRequired: false }] },
    { type: 'movie', id: 'asian_movie_th', name: '🇹🇭 Thai Movies', extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama'], isRequired: false }] }
  ],
  idPrefixes: ['tmdb:', 'tt']
};

const builder = new addonBuilder(manifest);

const GENRE_MAPPING = {
  'Action': 28, 'Comedy': 35, 'Romance': 10749, 'Horror': 27, 'Thriller': 53, 'Drama': 18
};

function mapToMeta(item, type) {
  return {
    id: `tmdb:${item.id}`,
    name: item.title || item.name, // Display title in Chinese/Localized
    type: type,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
    description: item.overview,
    releaseInfo: (item.release_date || item.first_air_date || '').substring(0, 4)
  };
}

function getRecentDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  const page = extra.skip ? Math.floor(extra.skip / 20) + 1 : 1;
  let countries = [];
  let languages = [];
  let genreId = extra.genre ? GENRE_MAPPING[extra.genre] : null;
  let customParams = {};

  if (id === 'asian_global_hits') {
    countries = ['KR', 'CN', 'JP', 'TH'];
    languages = ['ko', 'zh', 'ja', 'th'];
    customParams = { 'vote_count.gte': 500 }; 
  } else if (id === 'asian_new_arrivals') {
    countries = ['KR', 'CN', 'JP', 'TH'];
    languages = ['ko', 'zh', 'ja', 'th'];
    customParams = { 'first_air_date.gte': getRecentDate() };
  } else if (id.includes('_kr')) {
    countries = ['KR']; languages = ['ko'];
  } else if (id.includes('_cn')) {
    countries = ['CN', 'HK', 'TW']; languages = ['zh'];
  } else if (id.includes('_jp')) {
    countries = ['JP']; languages = ['ja'];
  } else if (id.includes('_th')) {
    countries = ['TH']; languages = ['th'];
  }

  try {
    const res = await require('axios').get('https://api.themoviedb.org/3' + (type === 'movie' ? '/discover/movie' : '/discover/tv'), {
      params: {
        api_key: process.env.TMDB_API_KEY,
        with_origin_country: countries.join('|'),
        with_original_language: languages.join('|'),
        with_genres: genreId,
        sort_by: 'popularity.desc',
        language: 'zh-CN', // Ensure catalog is in Chinese
        page: page,
        ...customParams
      }
    });
    const metas = (res.data.results || []).map(item => mapToMeta(item, type));
    return { metas };
  } catch (err) {
    return { metas: [] };
  }
});

builder.defineMetaHandler(async ({ type, id }) => {
  const tmdbId = id.replace('tmdb:', '');
  const item = await tmdb.getDetails(type, tmdbId, 'zh-CN');

  if (item) {
    const imdbId = item.external_ids?.imdb_id;
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);

    const meta = {
      id: imdbId || id,
      type: type,
      name: item.title || item.name, // RESTORED: Localized title
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
      description: item.overview,
      releaseInfo: year,
      genres: (item.genres || []).map(g => g.name),
      cast: (item.credits?.cast || []).slice(0, 5).map(c => c.name),
      director: (item.credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name)
    };

    if (type === 'series' && imdbId && item.seasons) {
      meta.videos = [];
      for (const season of item.seasons) {
        if (season.season_number === 0) continue;
        const seasonData = await tmdb.getSeasonDetails(tmdbId, season.season_number);
        if (seasonData && seasonData.episodes) {
          seasonData.episodes.forEach(ep => {
            meta.videos.push({
              id: `${imdbId}:${ep.season_number}:${ep.episode_number}`,
              title: ep.name || `Episode ${ep.episode_number}`,
              released: ep.air_date ? new Date(ep.air_date).toISOString() : null,
              season: ep.season_number,
              episode: ep.episode_number
            });
          });
        }
      }
    }
    return { meta };
  }
  return { meta: null };
});

module.exports = builder.getInterface();
