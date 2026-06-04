const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ajaysinghbisht2255_db_user:Sviren@225@cluster0.vrrnd3e.mongodb.net/?appName=Cluster0';
const PUBLIC_DIR = path.join(__dirname, 'public');

let db;

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('bugtrack');
  console.log('✓ Connected to MongoDB Atlas!');
}

function getContentType(filePath) {
  const ext = path.extname(filePath);
  const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.json':'application/json', '.ico':'image/x-icon' };
  return types[ext] || 'text/plain';
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE', 'Access-Control-Allow-Headers':'Content-Type' });
    res.end(); return;
  }

  // GET all issues
  if (pathname === '/api/issues' && req.method === 'GET') {
    const issues = await db.collection('issues').find({}).toArray();
    return sendJSON(res, 200, issues);
  }

  // POST new issue
  if (pathname === '/api/issues' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      const issue = JSON.parse(body);
      const issues = await db.collection('issues').find({}).toArray();
      const newId = issues.length ? Math.max(...issues.map(i => i.id)) + 1 : 1;
      const clientIssues = issues.filter(i => i.client === issue.client);
      issue.id = newId;
      issue.sn = clientIssues.length + 1;
      await db.collection('issues').insertOne(issue);
      sendJSON(res, 201, issue);
    });
    return;
  }

  // PUT update issue
  if (pathname.startsWith('/api/issues/') && req.method === 'PUT') {
    const id = parseInt(pathname.split('/').pop());
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      const update = JSON.parse(body);
      await db.collection('issues').updateOne({ id }, { $set: update });
      const updated = await db.collection('issues').findOne({ id });
      sendJSON(res, 200, updated);
    });
    return;
  }

  // DELETE issue
  if (pathname.startsWith('/api/issues/') && req.method === 'DELETE') {
    const id = parseInt(pathname.split('/').pop());
    await db.collection('issues').deleteOne({ id });
    sendJSON(res, 200, { deleted: id });
    return;
  }

  // Static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════╗');
    console.log('  ║   BugTrack is running!           ║');
    console.log('  ║   Running on port: ' + PORT + '           ║');
    console.log('  ╚══════════════════════════════════╝');
    console.log('');
  });
}).catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});
