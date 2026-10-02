// /api/admin/users
const { corsPreflight, adminUsers } = require('../../src/vercel-handler');
module.exports = async function handler(req, res) {
  if (corsPreflight(req, res)) return;
  return adminUsers(req, res);
};
