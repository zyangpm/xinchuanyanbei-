// /api/questions/:id
const { corsPreflight, questionById } = require('../../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  const id = req.query && req.query.id;
  if (!id) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ code: 400, message: '缺少题目 id', data: null }));
  }
  return questionById(req, res, id);
};
