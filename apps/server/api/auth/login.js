// /api/auth/login
const { corsPreflight, login } = require('../../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  return login(req, res);
};
