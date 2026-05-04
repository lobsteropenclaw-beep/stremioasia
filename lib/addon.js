const { addonBuilder } = require('stremio-addon-sdk');
const tmdb = require('./tmdb-api');

const manifest = {
  id: 'community.stremio.asian-discovery',
  version: '2.0.0',
  name: 'Asian Discovery (TMDb)',
  description: 'High-quality discovery addon for Korean, Chinese, and Japanese movies and dramas. Powered by TMDb.',
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
  idPrefixes: ['tmdb:']
};

const builder = new addonBuilder(manifest);

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
    const meta = {
      id: id,
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
    return { meta };
  }

  return { meta: null };
});

module.exports = builder.getInterface();
