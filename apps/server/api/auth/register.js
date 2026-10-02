// /api/auth/register
const { corsPreflight, register } = require('../../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  return register(req, res);
};
