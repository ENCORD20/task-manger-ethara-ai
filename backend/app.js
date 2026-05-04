require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

// SPA on another Vercel host → cross-origin POST with JSON fires a preflight OPTIONS.
const corsMw = cors({
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 204,
});

app.use(corsMw);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.send('Task Manager API is running');
});

module.exports = app;
