const { addonBuilder } = require('stremio-addon-sdk');
const tmdb = require('./tmdb-api');

const manifest = {
  id: 'community.stremio.asian-discovery-v11',
  version: '11.0.0',
  name: 'Asian Discovery ULTIMATE (Expanded)',
  description: 'Massive catalogs for Korean, Chinese, Japanese, and Thai content. Full series & scraper support.',
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  catalogs: [
    // --- TV SHOWS (SERIES) ---
    { type: 'series', id: 'asian_drama_kr', name: '🇰🇷 Korean Dramas', extra: [{ name: 'skip' }] },
    { type: 'series', id: 'asian_drama_cn', name: '🇨🇳 Chinese Dramas', extra: [{ name: 'skip' }] },
    { type: 'series', id: 'asian_drama_jp', name: '🇯🇵 Japanese Shows', extra: [{ name: 'skip' }] },
    { type: 'series', id: 'asian_drama_th', name: '🇹🇭 Thai Dramas', extra: [{ name: 'skip' }] },
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
    name: item.title || item.name,
    type: type,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
    description: item.overview,
    releaseInfo: (item.release_date || item.first_air_date || '').substring(0, 4)
  };
}

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  // Stremio skip usually works in chunks of 20
  const skip = extra.skip || 0;
  const page = Math.floor(skip / 20) + 1;
  
  let countries = [];
  let languages = [];
  let genreId = extra.genre ? GENRE_MAPPING[extra.genre] : null;

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
    const res = await require('axios').get('https://api.themoviedb.org/3' + (type === 'movie' ? '/discover/movie' : '/discover/tv'), {
      params: {
        api_key: process.env.TMDB_API_KEY,
        with_origin_country: countries.join('|'),
        with_original_language: languages.join('|'),
        with_genres: genreId,
        sort_by: 'popularity.desc',
        language: 'zh-CN',
        page: page
      }
    });
    
    const metas = (res.data.results || []).map(item => mapToMeta(item, type));
    return { metas, cacheMaxAge: 7200 }; // Cache for 2 hours
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
    // Only fetch episodes for the actual seasons (skip specials for speed)
    const validSeasons = item.seasons.filter(s => s.season_number > 0);
    
    // We fetch details for all seasons to populate the dropdown
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
