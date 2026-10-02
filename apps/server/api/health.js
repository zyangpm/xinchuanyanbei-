// /api/health
const { corsPreflight, health } = require('../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  return health(req, res);
};
