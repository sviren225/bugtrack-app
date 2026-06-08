const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://ajaysinghbisht2255_db_user:Sviren@225@cluster0.vrrnd3e.mongodb.net/?appName=Cluster0';

const PUBLIC_DIR = path.join(__dirname, 'public');

let db;

// ---------------- CONNECT DB ----------------
async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  db = client.db('bugtrack');

  // default admin
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

  console.log('✓ Connected to MongoDB Atlas');
}

// ---------------- HELPERS ----------------
function getContentType(filePath) {
  const ext = path.extname(filePath);
  const map = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.ico': 'image/x-icon'
  };
  return map[ext] || 'text/plain';
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

// ---------------- SAFE ADMIN CHECK ----------------
function isAdmin(req, res) {
  const role = req.headers['x-role'] || 'User';

  if (role !== 'Admin') {
    sendJSON(res, 403, {
      success: false,
      message: 'Access denied (Admin only)'
    });
    return false;
  }
  return true;
}

// ---------------- SERVER ----------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type,x-role'
    });
    res.end();
    return;
  }

  // ================= ISSUES =================

  if (pathname === '/api/issues' && req.method === 'GET') {
    const issues = await db.collection('issues').find({}).toArray();
    return sendJSON(res, 200, issues);
  }

  if (pathname === '/api/issues' && req.method === 'POST') {
    let body = '';
    req.on('data', d => (body += d));

    req.on('end', async () => {
      try {
        const issue = JSON.parse(body);

        const last = await db.collection('issues')
          .find({ id: { $type: 'number' } })
          .sort({ id: -1 })
          .limit(1)
          .toArray();

        issue.id = last.length ? last[0].id + 1 : 1;

        await db.collection('issues').insertOne(issue);

        sendJSON(res, 201, issue);
      } catch (e) {
        console.error(e);
        sendJSON(res, 500, { error: 'Issue create failed' });
      }
    });

    return;
  }

  if (pathname.startsWith('/api/issues/') && req.method === 'PUT') {
    const id = parseInt(pathname.split('/').pop());

    let body = '';
    req.on('data', d => (body += d));

    req.on('end', async () => {
      const update = JSON.parse(body);

      await db.collection('issues').updateOne({ id }, { $set: update });

      const updated = await db.collection('issues').findOne({ id });

      sendJSON(res, 200, updated);
    });

    return;
  }

  if (pathname.startsWith('/api/issues/') && req.method === 'DELETE') {
    const id = parseInt(pathname.split('/').pop());

    await db.collection('issues').deleteOne({ id });

    return sendJSON(res, 200, { deleted: id });
  }

  // ================= USERS (PROTECTED) =================

  if (pathname === '/api/users' && req.method === 'GET') {
    if (!isAdmin(req, res)) return;

    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .toArray();

    return sendJSON(res, 200, users);
  }

  if (pathname === '/api/users' && req.method === 'POST') {
    if (!isAdmin(req, res)) return;

    let body = '';
    req.on('data', d => (body += d));

    req.on('end', async () => {
      const { name, username, email, password, role } = JSON.parse(body);

      const existing = await db.collection('users').findOne({ username });

      if (existing) {
        return sendJSON(res, 409, {
          success: false,
          message: 'User exists'
        });
      }

      const user = {
        name,
        username,
        email,
        password,
        role,
        active: true,
        createdAt: new Date()
      };

      const result = await db.collection('users').insertOne(user);

      return sendJSON(res, 201, {
        success: true,
        userId: result.insertedId
      });
    });

    return;
  }

  if (pathname.startsWith('/api/users/') && req.method === 'DELETE') {
    if (!isAdmin(req, res)) return;

    const id = pathname.split('/').pop();

    await db.collection('users').deleteOne({
      _id: new ObjectId(id)
    });

    return sendJSON(res, 200, { success: true });
  }

  // ================= LOGIN =================

  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', d => (body += d));

    req.on('end', async () => {
      const { username, password } = JSON.parse(body);

      const user = await db.collection('users').findOne({
        username,
        password,
        active: true
      });

      if (!user) {
        return sendJSON(res, 401, {
          success: false,
          message: 'Invalid login'
        });
      }

      return sendJSON(res, 200, {
        success: true,
        user: {
          username: user.username,
          name: user.name,
          role: user.role
        }
      });
    });

    return;
  }

  // ================= STATIC =================
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
});

// ---------------- START ----------------
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log('\n✔ BugTrack running on port ' + PORT + '\n');
    });
  })
  .catch(err => {
    console.error(err);
  });
