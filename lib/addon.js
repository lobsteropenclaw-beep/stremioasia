const { addonBuilder } = require('stremio-addon-sdk');
const iyfApi = require('./iyf-api');

const manifest = {
  id: 'community.stremio.iyf-discovery',
  version: '1.0.0',
  name: 'IYF.TV Asian Discovery',
  description: 'Discovery addon for Asian movies and series from IYF.TV. Provides catalogs and metadata only.',
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  catalogs: [
    {
      type: 'movie',
      id: 'iyf_asian_movies',
      name: 'IYF Asian Movies'
    },
    {
      type: 'series',
      id: 'iyf_asian_series',
      name: 'IYF Asian Series'
    }
  ],
  idPrefixes: ['iyf:']
};

const builder = new addonBuilder(manifest);

// Mapping IYF item to Stremio Meta object
function mapToMeta(item, type) {
  return {
    id: `iyf:${item.id || item.video_id}`,
    name: item.title || item.video_name,
    type: type,
    poster: item.image || item.poster_url || item.video_image,
    description: item.description || item.summary,
    releaseInfo: item.year || item.video_year || ''
  };
}

// Catalog Handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  let items = [];
  const page = extra.skip ? Math.floor(extra.skip / 30) + 1 : 1;

  if (id === 'iyf_asian_movies') {
    const data = await iyfApi.getVideoList(1, page, 30);
    if (data && data.data && data.data.list) {
      items = data.data.list.map(item => mapToMeta(item, 'movie'));
    }
  } else if (id === 'iyf_asian_series') {
    const data = await iyfApi.getVideoList(2, page, 30);
    if (data && data.data && data.data.list) {
      items = data.data.list.map(item => mapToMeta(item, 'series'));
    }
  }

  return { metas: items };
});

// Meta Handler
builder.defineMetaHandler(async ({ type, id }) => {
  const iyfId = id.replace('iyf:', '');
  const data = await iyfApi.getVideoDetail(iyfId);
  
  if (data && data.data) {
    const item = data.data;
    const meta = {
      id: id,
      type: type,
      name: item.title || item.video_name,
      poster: item.image || item.poster_url || item.video_image,
      background: item.background || item.video_background,
      description: item.description || item.summary,
      releaseInfo: item.year || item.video_year || '',
      genres: item.tags ? item.tags.split(',') : [],
      director: item.director ? [item.director] : [],
      cast: item.actors ? item.actors.split(',') : []
    };
    return { meta };
  }

  return { meta: null };
});

module.exports = builder.getInterface();
