// /api/admin/stats
const { corsPreflight, adminStats } = require('../../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  return adminStats(req, res);
};
