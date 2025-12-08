import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const VERSION = '4.0.0-fresh-start';

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  const fs = require('fs');
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  const indexExists = fs.existsSync(path.join(frontendDistPath, 'index.html'));
  
  let dirContents: string[] = [];
  try {
    dirContents = fs.readdirSync(frontendDistPath);
  } catch (e) {
    dirContents = ['Error reading directory: ' + e];
  }
  
  res.json({
    status: 'healthy',
    version: VERSION,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    __dirname: __dirname,
    frontendPath: frontendDistPath,
    indexExists: indexExists,
    dirContents: dirContents
  });
});

// Serve static frontend files
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
console.log('📁 Frontend path:', frontendDistPath);

app.use(express.static(frontendDistPath, { 
  index: 'index.html',
  extensions: ['html']
}));

// SPA fallback - alle routes naar index.html
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  console.log('📄 Serving:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(404).send('Frontend not found');
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 TeamNL Cloud9 Racing Team Dashboard');
  console.log(`📦 Version: ${VERSION}`);
  console.log(`🌍 Port: ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Server running!\n`);
});
