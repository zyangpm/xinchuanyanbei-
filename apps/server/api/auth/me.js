// /api/auth/me
const { corsPreflight, me } = require('../../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  return me(req, res);
};
