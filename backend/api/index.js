require('dotenv').config();
const serverless = require('serverless-http');
const app = require('../app');
const { connectDB } = require('../db');

const handler = serverless(app);

module.exports = async (req, res) => {
  await connectDB();
  return handler(req, res);
};
