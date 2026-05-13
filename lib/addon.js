const { addonBuilder } = require('stremio-addon-sdk');
const tmdb = require('./tmdb-api');

const manifest = {
  id: 'community.stremio.asian-discovery-v7',
  version: '7.0.0',
  name: 'Asian Discovery ULTIMATE (Debrid Optimized)',
  description: 'Premium catalogs optimized for Real-Debrid/PikPak. Features trending lists and genre filters.',
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  catalogs: [
    // --- TRENDING (Best for Debrid Cache) ---
    {
      type: 'series',
      id: 'trending_drama',
      name: '🔥 Trending Asian Dramas',
      extra: [{ name: 'skip' }]
    },
    // --- TV SHOWS (SERIES) ---
    {
      type: 'series',
      id: 'asian_drama_kr',
      name: '🇰🇷 Korean Dramas',
      extra: [{ name: 'skip' }]
    },
    {
      type: 'series',
      id: 'asian_drama_cn',
      name: '🇨🇳 Chinese Dramas',
      extra: [{ name: 'skip' }]
    },
    {
      type: 'series',
      id: 'asian_drama_jp',
      name: '🇯🇵 Japanese Shows',
      extra: [{ name: 'skip' }]
    },
    {
      type: 'series',
      id: 'asian_drama_th',
      name: '🇹🇭 Thai Dramas',
      extra: [{ name: 'skip' }]
    },
    // --- MOVIES ---
    {
      type: 'movie',
      id: 'asian_movie_kr',
      name: '🇰🇷 Korean Movies',
      extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama', 'Animation'], isRequired: false }]
    },
    {
      type: 'movie',
      id: 'asian_movie_cn',
      name: '🇨🇳 Chinese Movies',
      extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama', 'Animation'], isRequired: false }]
    },
    {
      type: 'movie',
      id: 'asian_movie_jp',
      name: '🇯🇵 Japanese Movies',
      extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama', 'Animation'], isRequired: false }]
    },
    {
      type: 'movie',
      id: 'asian_movie_th',
      name: '🇹🇭 Thai Movies',
      extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama', 'Animation'], isRequired: false }]
    }
  ],
  idPrefixes: ['tmdb:', 'tt']
};

const builder = new addonBuilder(manifest);

const GENRE_MAPPING = {
  'Action': 28, 'Comedy': 35, 'Romance': 10749, 'Horror': 27, 'Thriller': 53, 'Drama': 18, 'Animation': 16
};

function mapToMeta(item, type) {
  return {
    id: `tmdb:${item.id}`,
    // CRITICAL: We keep English titles for discovery names as they match Debrid caches better
    name: item.title || item.name, 
    type: type,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
    description: item.overview,
    releaseInfo: (item.release_date || item.first_air_date || '').substring(0, 4)
  };
}

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  const page = extra.skip ? Math.floor(extra.skip / 20) + 1 : 1;
  let countries = [];
  let languages = [];
  let genreId = extra.genre ? GENRE_MAPPING[extra.genre] : null;

  if (id === 'trending_drama') {
    countries = ['KR', 'CN', 'JP', 'HK', 'TW', 'TH'];
    languages = ['ko', 'zh', 'ja', 'th'];
  } else if (id.includes('_kr')) {
    countries = ['KR']; languages = ['ko'];
  } else if (id.includes('_cn')) {
    countries = ['CN', 'HK', 'TW']; languages = ['zh'];
  } else if (id.includes('_jp')) {
    countries = ['JP']; languages = ['ja'];
  } else if (id.includes('_th')) {
    countries = ['TH']; languages = ['th'];
  }

  const data = await tmdb.discover(type, countries, languages, page, genreId);
  const metas = (data.results || []).map(item => mapToMeta(item, type));

  return { metas };
});

builder.defineMetaHandler(async ({ type, id }) => {
  const tmdbId = id.replace('tmdb:', '');
  const item = await tmdb.getDetails(type, tmdbId);

  if (item) {
    const imdbId = item.external_ids?.imdb_id;
    
    const meta = {
      id: imdbId || id,
      type: type,
      // For the Meta detail, we use the English title but add the original title in description
      name: item.title || item.name,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
      description: `${item.overview}\n\nOriginal Title: ${item.original_title || item.original_name}`,
      releaseInfo: (item.release_date || item.first_air_date || '').substring(0, 4),
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
