const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 5173;
const BACKEND_URL = 'https://bk-backend.vercel.app';

// Proxy API requests to the backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  logLevel: 'info',
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: 'Proxy error occurred' });
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes or static assets
  if (req.path.startsWith('/api') || 
      req.path.includes('.') || 
      req.path.startsWith('/dist') ||
      req.path.startsWith('/src') ||
      req.path.startsWith('/public')) {
    res.status(404).send('Not found');
    return;
  }
  
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Development server running at http://localhost:${PORT}`);
  console.log(`Proxying API requests to ${BACKEND_URL}`);
});
