const { addonBuilder } = require('stremio-addon-sdk');
const tmdb = require('./tmdb-api');

const years = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'];

const manifest = {
  id: 'community.stremio.asian-discovery-v13',
  version: '13.0.0',
  name: 'Asian Discovery ULTIMATE + YEARS',
  description: 'Premium catalogs for Asian content. Filter by Country, Genre, and Year.',
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  catalogs: [
    // --- TV SHOWS (SERIES) ---
    { 
      type: 'series', 
      id: 'asian_drama_kr', 
      name: '🇰🇷 Korean Dramas', 
      extra: [
        { name: 'skip' },
        { name: 'genre', options: ['Action', 'Comedy', 'Drama', 'Mystery', 'Romance', 'Sci-Fi & Fantasy'], isRequired: false },
        { name: 'year', options: years, isRequired: false }
      ] 
    },
    { 
      type: 'series', 
      id: 'asian_drama_cn', 
      name: '🇨🇳 Chinese Dramas', 
      extra: [
        { name: 'skip' },
        { name: 'genre', options: ['Action', 'Comedy', 'Drama', 'Mystery', 'Romance', 'Sci-Fi & Fantasy'], isRequired: false },
        { name: 'year', options: years, isRequired: false }
      ] 
    },
    { 
      type: 'series', 
      id: 'asian_drama_jp', 
      name: '🇯🇵 Japanese Shows', 
      extra: [
        { name: 'skip' },
        { name: 'genre', options: ['Action', 'Comedy', 'Drama', 'Mystery', 'Romance', 'Sci-Fi & Fantasy'], isRequired: false },
        { name: 'year', options: years, isRequired: false }
      ] 
    },
    { 
      type: 'series', 
      id: 'asian_drama_th', 
      name: '🇹🇭 Thai Dramas', 
      extra: [
        { name: 'skip' },
        { name: 'genre', options: ['Action', 'Comedy', 'Drama', 'Mystery', 'Romance', 'Sci-Fi & Fantasy'], isRequired: false },
        { name: 'year', options: years, isRequired: false }
      ] 
    },
    // --- MOVIES ---
    { 
      type: 'movie', 
      id: 'asian_movie_kr', 
      name: '🇰🇷 Korean Movies', 
      extra: [
        { name: 'skip' },
        { name: 'genre', options: ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Thriller'], isRequired: false },
        { name: 'year', options: years, isRequired: false }
      ] 
    },
    { 
      type: 'movie', 
      id: 'asian_movie_cn', 
      name: '🇨🇳 Chinese Movies', 
      extra: [
        { name: 'skip' },
        { name: 'genre', options: ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Thriller'], isRequired: false },
        { name: 'year', options: years, isRequired: false }
      ] 
    },
    { 
      type: 'movie', 
      id: 'asian_movie_jp', 
      name: '🇯🇵 Japanese Movies', 
      extra: [
        { name: 'skip' },
        { name: 'genre', options: ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Thriller'], isRequired: false },
        { name: 'year', options: years, isRequired: false }
      ] 
    },
    { 
      type: 'movie', 
      id: 'asian_movie_th', 
      name: '🇹🇭 Thai Movies', 
      extra: [
        { name: 'skip' },
        { name: 'genre', options: ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Thriller'], isRequired: false },
        { name: 'year', options: years, isRequired: false }
      ] 
    }
  ],
  idPrefixes: ['tmdb:', 'tt']
};

const builder = new addonBuilder(manifest);

const GENRE_MAPPING = {
  'Action': '28|10759',
  'Comedy': '35',
  'Drama': '18',
  'Horror': '27',
  'Romance': '10749',
  'Thriller': '53',
  'Mystery': '9648',
  'Sci-Fi & Fantasy': '878|10765',
  'Animation': '16',
  'Crime': '80'
};

function mapToMeta(item, type) {
  return {
    id: `tmdb:${item.id}`,
    name: item.title || item.name,
    type: type,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
    description: item.overview,
    releaseInfo: (item.release_date || item.first_air_date || '').substring(0, 4)
  };
}

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  const skip = extra.skip || 0;
  const page = Math.floor(skip / 20) + 1;
  
  let countries = [];
  let languages = [];
  let genreId = extra.genre ? GENRE_MAPPING[extra.genre] : null;
  let year = extra.year || null;

  if (id.includes('_kr')) {
    countries = ['KR']; languages = ['ko'];
  } else if (id.includes('_cn')) {
    countries = ['CN', 'HK', 'TW']; languages = ['zh'];
  } else if (id.includes('_jp')) {
    countries = ['JP']; languages = ['ja'];
  } else if (id.includes('_th')) {
    countries = ['TH']; languages = ['th'];
  }

  try {
    const params = {
      api_key: process.env.TMDB_API_KEY,
      with_origin_country: countries.join('|'),
      with_original_language: languages.join('|'),
      with_genres: genreId,
      sort_by: 'popularity.desc',
      language: 'zh-CN',
      page: page
    };

    if (year) {
      if (type === 'movie') {
        params.primary_release_year = year;
      } else {
        params.first_air_date_year = year;
      }
    }

    const res = await require('axios').get('https://api.themoviedb.org/3' + (type === 'movie' ? '/discover/movie' : '/discover/tv'), { params });
    
    const metas = (res.data.results || []).map(item => mapToMeta(item, type));
    return { metas, cacheMaxAge: 7200 };
  } catch (err) {
    return { metas: [] };
  }
});

builder.defineMetaHandler(async ({ type, id }) => {
  const tmdbId = id.startsWith('tmdb:') ? id.replace('tmdb:', '') : null;
  if (!tmdbId) return { meta: null };

  const item = await tmdb.getDetails(type, tmdbId, 'zh-CN');
  if (!item) return { meta: null };

  const imdbId = item.external_ids?.imdb_id;
  const year = (item.release_date || item.first_air_date || '').substring(0, 4);

  const meta = {
    id: imdbId || id,
    type: type,
    name: item.title || item.name,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
    description: item.overview,
    releaseInfo: year,
    genres: (item.genres || []).map(g => g.name),
    cast: (item.credits?.cast || []).slice(0, 5).map(c => c.name),
    director: (item.credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name)
  };

  if (type === 'series' && item.seasons) {
    meta.videos = [];
    const validSeasons = item.seasons.filter(s => s.season_number > 0);
    const seasonPromises = validSeasons.map(s => tmdb.getSeasonDetails(tmdbId, s.season_number));
    const seasonsData = await Promise.all(seasonPromises);

    seasonsData.forEach(seasonData => {
      if (seasonData && seasonData.episodes) {
        seasonData.episodes.forEach(ep => {
          meta.videos.push({
            id: imdbId ? `${imdbId}:${ep.season_number}:${ep.episode_number}` : `tmdb:${tmdbId}:${ep.season_number}:${ep.episode_number}`,
            title: ep.name || `Episode ${ep.episode_number}`,
            released: ep.air_date ? new Date(ep.air_date).toISOString() : null,
            season: ep.season_number,
            episode: ep.episode_number
          });
        });
      }
    });
  }

  return { meta };
});

module.exports = builder.getInterface();
