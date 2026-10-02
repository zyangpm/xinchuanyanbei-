// /api/questions
const { corsPreflight, questions } = require('../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  return questions(req, res);
};
