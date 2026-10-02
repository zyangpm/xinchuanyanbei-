// /api/questions/sync
const { corsPreflight, questionSync } = require('../../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  return questionSync(req, res);
};
