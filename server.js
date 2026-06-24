const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ajaysinghbisht2255_db_user:Sviren%40225@cluster0.vrrnd3e.mongodb.net/?appName=Cluster0';
const PUBLIC_DIR = path.join(__dirname, 'public');

let db;

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('bugtrack');

  const adminUser = await db.collection('users').findOne({ username: 'admin' });
  if (!adminUser) {
    await db.collection('users').insertOne({
      name: 'System Administrator',
      username: 'admin',
      email: 'admin@bugtrack.local',
      password: 'admin123',
      role: 'Admin',
      active: true,
      createdAt: new Date()
    });
    console.log('✓ Default admin user created');
  }
  console.log('✓ Connected to MongoDB Atlas!');
}

function getContentType(filePath) {
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.ico': 'image/x-icon' };
  return types[ext] || 'text/plain';
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function cleanDoc(doc) {
  const { _id, ...rest } = doc;
  if (rest.id == null) rest.id = _id ? _id.toString() : null;
  return rest;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }

  // ── ISSUES ──────────────────────────────────────────────

  if (pathname === '/api/issues' && req.method === 'GET') {
    const issues = await db.collection('issues').find({}).toArray();
    return sendJSON(res, 200, issues.map(cleanDoc));
  }

  if (pathname === '/api/issues' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const issue = JSON.parse(body);
        const lastIssue = await db.collection('issues').find({ id: { $type: 'number' } }).sort({ id: -1 }).limit(1).toArray();
        const newId = lastIssue.length ? lastIssue[0].id + 1 : 1;
        const clientCount = await db.collection('issues').countDocuments({ client: issue.client });
        issue.id = newId;
        issue.sn = clientCount + 1;
        await db.collection('issues').insertOne(issue);
        sendJSON(res, 201, cleanDoc(issue));
      } catch (err) {
        console.error(err);
        sendJSON(res, 500, { error: 'Failed to create issue' });
      }
    });
    return;
  }

  if (pathname.startsWith('/api/issues/') && req.method === 'PUT') {
    const id = parseInt(pathname.split('/').pop());
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      const update = JSON.parse(body);
      await db.collection('issues').updateOne({ id }, { $set: update });
      const updated = await db.collection('issues').findOne({ id });
      sendJSON(res, 200, cleanDoc(updated));
    });
    return;
  }

  if (pathname.startsWith('/api/issues/') && req.method === 'DELETE') {
    const id = parseInt(pathname.split('/').pop());
    await db.collection('issues').deleteOne({ id });
    sendJSON(res, 200, { deleted: id });
    return;
  }

  // ── USERS ────────────────────────────────────────────────

  if (pathname === '/api/users' && req.method === 'GET') {
    try {
      const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
      return sendJSON(res, 200, users);
    } catch (err) {
      return sendJSON(res, 500, { error: 'Failed to fetch users' });
    }
  }

  if (pathname === '/api/users' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const { name, username, email, password, role } = JSON.parse(body);
        if (!username || !password || !role) return sendJSON(res, 400, { success: false, message: 'Missing required fields' });
        const existing = await db.collection('users').findOne({ username });
        if (existing) return sendJSON(res, 409, { success: false, message: 'Username already exists' });
        const result = await db.collection('users').insertOne({ name, username, email, password, role, active: true, createdAt: new Date() });
        return sendJSON(res, 201, { success: true, message: 'User created successfully', userId: result.insertedId });
      } catch (err) {
        return sendJSON(res, 500, { success: false, message: 'Failed to create user' });
      }
    });
    return;
  }

  // PUT update user
  if (pathname.startsWith('/api/users/') && req.method === 'PUT') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const id = pathname.split('/').pop();
        const { name, username, email, password, role } = JSON.parse(body);
        const updateFields = { name, username, email, role };
        if (password && password.trim()) updateFields.password = password.trim();
        await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
        return sendJSON(res, 200, { success: true, message: 'User updated successfully' });
      } catch (err) {
        return sendJSON(res, 500, { success: false, message: 'Failed to update user' });
      }
    });
    return;
  }

  if (pathname.startsWith('/api/users/') && req.method === 'DELETE') {
    try {
      const id = pathname.split('/').pop();
      await db.collection('users').deleteOne({ _id: new ObjectId(id) });
      return sendJSON(res, 200, { success: true, message: 'User deleted' });
    } catch (err) {
      return sendJSON(res, 500, { error: 'Failed to delete user' });
    }
  }

  // ── LOGIN ─────────────────────────────────────────────────

  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const { username, password } = JSON.parse(body);
        const user = await db.collection('users').findOne({ username, password, active: true });
        if (!user) return sendJSON(res, 401, { success: false, message: 'Invalid username or password' });
        return sendJSON(res, 200, { success: true, user: { username: user.username, name: user.name, role: user.role } });
      } catch (err) {
        return sendJSON(res, 500, { success: false, message: 'Login failed' });
      }
    });
    return;
  }

  // ── STATIC FILES ─────────────────────────────────────────

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
