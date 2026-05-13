const { addonBuilder } = require('stremio-addon-sdk');
const tmdb = require('./tmdb-api');

const manifest = {
  id: 'community.stremio.asian-discovery-v9',
  version: '9.0.0',
  name: 'Asian Discovery ELITE (High Retention)',
  description: 'Optimized for Real-Debrid. Features Global Hits and New Releases to avoid copyright removals.',
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  catalogs: [
    // --- HIGH RETENTION (Best for Debrid) ---
    {
      type: 'series',
      id: 'asian_global_hits',
      name: '💎 Asian Global Hits (Netflix/Disney+)',
      extra: [{ name: 'skip' }]
    },
    {
      type: 'series',
      id: 'asian_new_arrivals',
      name: '🆕 Just Released (Last 30 Days)',
      extra: [{ name: 'skip' }]
    },
    // --- REGIONAL ---
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
      type: 'movie',
      id: 'asian_movie_kr',
      name: '🇰🇷 Korean Movies',
      extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama'], isRequired: false }]
    },
    {
      type: 'movie',
      id: 'asian_movie_cn',
      name: '🇨🇳 Chinese Movies',
      extra: [{ name: 'skip' }, { name: 'genre', options: ['Action', 'Comedy', 'Romance', 'Horror', 'Thriller', 'Drama'], isRequired: false }]
    }
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

// Helper to get date 30 days ago
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
    // Filter for content likely to be on Global Platforms (high vote count)
    customParams = { 'vote_count.gte': 500 }; 
  } else if (id === 'asian_new_arrivals') {
    countries = ['KR', 'CN', 'JP', 'TH'];
    languages = ['ko', 'zh', 'ja', 'th'];
    customParams = { 'first_air_date.gte': getRecentDate() };
  } else if (id.includes('_kr')) {
    countries = ['KR']; languages = ['ko'];
  } else if (id.includes('_cn')) {
    countries = ['CN', 'HK', 'TW']; languages = ['zh'];
  }

  // Fetch using TMDb discover with our Debrid-optimized logic
  try {
    const res = await require('axios').get('https://api.themoviedb.org/3' + (type === 'movie' ? '/discover/movie' : '/discover/tv'), {
      params: {
        api_key: process.env.TMDB_API_KEY,
        with_origin_country: countries.join('|'),
        with_original_language: languages.join('|'),
        with_genres: genreId,
        sort_by: 'popularity.desc',
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
  const englishItem = await tmdb.getDetails(type, tmdbId, 'en-US');
  const chineseItem = await tmdb.getDetails(type, tmdbId, 'zh-CN');

  const item = chineseItem || englishItem;
  if (item) {
    const imdbId = item.external_ids?.imdb_id;
    
    // Clean Title: "Movie Name (2024)" - This is the "Gold Standard" for Debrid Scrapers
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
    const cleanName = (englishItem?.title || englishItem?.name || item.title || item.name).replace(/[^\w\s]/gi, '');

    const meta = {
      id: imdbId || id,
      type: type,
      name: `${cleanName} (${year})`,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
      description: `${item.overview}\n\nOriginal: ${item.original_title || item.original_name}`,
      releaseInfo: year,
      genres: (item.genres || []).map(g => g.name),
      cast: (item.credits?.cast || []).slice(0, 5).map(c => c.name)
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
