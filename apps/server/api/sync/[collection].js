// /api/sync/:collection
const { corsPreflight, sync } = require('../../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  const c = req.query && req.query.collection;
  if (!c) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ code: 400, message: '缺少同步集合名', data: null }));
  }
  return sync(req, res, c);
};
