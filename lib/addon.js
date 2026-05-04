const { addonBuilder } = require('stremio-addon-sdk');
const tmdb = require('./tmdb-api');

const manifest = {
  id: 'community.stremio.asian-discovery-v4',
  version: '4.0.0',
  name: 'Asian Discovery ULTIMATE + EPISODES',
  description: 'Premium Korean, Chinese, and Japanese catalogs. Full seasons/episodes support with stream scrapers.',
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  catalogs: [
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
      type: 'movie',
      id: 'asian_movies_all',
      name: '🌏 Popular Asian Movies',
      extra: [{ name: 'skip' }]
    }
  ],
  idPrefixes: ['tmdb:', 'tt']
};

const builder = new addonBuilder(manifest);

function mapToMeta(item, type) {
  return {
    id: `tmdb:${item.id}`, // Keep TMDb ID for catalog browsing
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

  if (id === 'asian_drama_kr') {
    countries = ['KR'];
    languages = ['ko'];
  } else if (id === 'asian_drama_cn') {
    countries = ['CN', 'HK', 'TW'];
    languages = ['zh'];
  } else if (id === 'asian_drama_jp') {
    countries = ['JP'];
    languages = ['ja'];
  } else if (id === 'asian_movies_all') {
    countries = ['KR', 'CN', 'JP', 'HK', 'TW'];
    languages = ['ko', 'zh', 'ja'];
  }

  const data = await tmdb.discover(type, countries, languages, page);
  const metas = (data.results || []).map(item => mapToMeta(item, type));

  return { metas };
});

builder.defineMetaHandler(async ({ type, id }) => {
  const tmdbId = id.replace('tmdb:', '');
  const item = await tmdb.getDetails(type, tmdbId);

  if (item) {
    // CRITICAL: Provide IMDb ID so scrapers can find streams
    const imdbId = item.external_ids?.imdb_id;
    
    const meta = {
      id: imdbId || id, // If IMDb ID exists, use it!
      type: type,
      name: item.title || item.name,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
      description: item.overview,
      releaseInfo: (item.release_date || item.first_air_date || '').substring(0, 4),
      genres: (item.genres || []).map(g => g.name),
      cast: (item.credits?.cast || []).slice(0, 5).map(c => c.name),
      director: (item.credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name)
    };

    // Populate seasons and episodes for series
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
