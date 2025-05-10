const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

const CACHE_KEYS = {
  POPULAR_EVENTS: 'popular_events',
  EVENT_DETAILS: 'event_details_',
  USER_TICKETS: 'user_tickets_',
  CREATOR_STATS: 'creator_stats_',
  HOMEPAGE_DATA: 'homepage_data'
};

const set = (key, data, ttl = undefined) => {
  return cache.set(key, data, ttl);
};

const get = (key) => {
  return cache.get(key);
};

const del = (key) => {
  return cache.del(key);
};

const delStartWith = (startStr) => {
  if (!startStr) return 0;
  
  const keys = cache.keys();
  const deletedKeys = keys.filter(k => k.startsWith(startStr));
  
  if (deletedKeys.length > 0) {
    cache.del(deletedKeys);
  }
  
  return deletedKeys.length;
};

const flush = () => {
  return cache.flushAll();
};

const stats = () => {
  return cache.getStats();
};

module.exports = {
  CACHE_KEYS,
  set,
  get,
  del,
  delStartWith,
  flush,
  stats
}; 