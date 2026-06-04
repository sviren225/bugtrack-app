const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'issues.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Seed data if file doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const seed = [
    { id:1, client:"SKH SMC", sn:1, title:"Data Missing Issue at SKH SMC Plant", desc:"Data is missing for several hours, and on some days, the data is not pushed to the cloud at all.", reporter:"Rahul Mishra", date:"2026-02-01", status:"Open", remark:"This issue has not been completely resolved yet. As per Ankush San's instruction, we have already sent a certification unblocking request to the SKH IT team. Currently, the data is visible and flowing properly; however, continuous monitoring during production is required for at least one week to confirm stability." },
    { id:2, client:"KML Seating", sn:1, title:"UI is not responding", desc:"While checking Gas and Wire data in the Combi PLC, the UI becomes unresponsive and crashes unexpectedly.", reporter:"Ajay Singh Bisht", date:"2026-03-31", status:"Under Observation", remark:"This issue was communicated to the development team and has now been resolved. However, continuous monitoring is still required for some time." },
    { id:3, client:"KML Seating", sn:2, title:"Missing Data", desc:"In most of the widgets, data is missing during certain hours, such as 9–10 AM, 3–4 PM, or 8–10 PM. The issue is inconsistent.", reporter:"Ajay Singh Bisht", date:"2026-03-31", status:"Closed", remark:"This issue was communicated to the development team and has now been resolved." },
    { id:4, client:"KML Seating", sn:3, title:"Shift Report Widget Issue", desc:"Shift Report widget does not display data properly. It does not show all three shifts consistently.", reporter:"Ajay Singh Bisht", date:"2026-03-31", status:"Closed", remark:"This issue was communicated to the development team and has now been resolved." },
    { id:5, client:"KML Plastics", sn:1, title:"Production planning is not proper", desc:"Production planning is not distributing properly across shift hours.", reporter:"Ajay Singh Bisht", date:"2026-04-14", status:"Closed", remark:"This issue was communicated to the development team and has now been resolved." },
    { id:6, client:"KML Plastics", sn:2, title:"Missing Data", desc:"In most of the widgets, data is missing during certain hours, such as 9–10 AM, 3–4 PM, or 8–10 PM.", reporter:"Ajay Singh Bisht", date:"2026-04-14", status:"Closed", remark:"This issue was communicated to the development team and has now been resolved." },
    { id:7, client:"KML Plastics", sn:3, title:"Shift Report Irregularity", desc:"Irregularity in the shift report section where production data for all shifts is not updating correctly.", reporter:"Ajay Singh Bisht", date:"2026-04-14", status:"Closed", remark:"This issue was communicated to the development team and has now been resolved." },
    { id:8, client:"KML Plastics", sn:4, title:"Machine Screen Data Delay (30s)", desc:"While switching between machine screens, the system displays the previously viewed machine data for around 30 seconds.", reporter:"Ajay Singh Bisht", date:"2026-04-14", status:"Under Observation", remark:"This issue was communicated to the development team. We will monitor for sometime." },
    { id:9, client:"KML Plastics", sn:5, title:"Forget Password Not Working", desc:"While monitoring widgets, data is fetching late — somewhere around 30 seconds.", reporter:"Ajay Singh Bisht", date:"2026-04-14", status:"Closed", remark:"This issue was communicated to the devops team and has now been resolved." },
    { id:10, client:"KML Plastics", sn:6, title:"Widgets UI Late Response", desc:"While switching between machine screens, the system displays the previously viewed machine data for around 30 seconds.", reporter:"Ajay Singh Bisht", date:"2026-04-14", status:"Open", remark:"This issue was communicated to the development team and has not resolved." },
  ];
  fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  console.log('✓ Seed data created.');
}

function readIssues() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeIssues(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE', 'Access-Control-Allow-Headers':'Content-Type' });
    res.end(); return;
  }

  // API routes
  if (pathname === '/api/issues' && req.method === 'GET') {
    return sendJSON(res, 200, readIssues());
  }

  if (pathname === '/api/issues' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const issue = JSON.parse(body);
      const issues = readIssues();
      const newId = issues.length ? Math.max(...issues.map(i=>i.id)) + 1 : 1;
      const clientIssues = issues.filter(i=>i.client===issue.client);
      issue.id = newId;
      issue.sn = clientIssues.length + 1;
      issues.push(issue);
      writeIssues(issues);
      sendJSON(res, 201, issue);
    });
    return;
  }

  if (pathname.startsWith('/api/issues/') && req.method === 'PUT') {
    const id = parseInt(pathname.split('/').pop());
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const update = JSON.parse(body);
      const issues = readIssues();
      const idx = issues.findIndex(i=>i.id===id);
      if (idx === -1) return sendJSON(res, 404, { error: 'Not found' });
      issues[idx] = { ...issues[idx], ...update };
      writeIssues(issues);
      sendJSON(res, 200, issues[idx]);
    });
    return;
  }

  if (pathname.startsWith('/api/issues/') && req.method === 'DELETE') {
    const id = parseInt(pathname.split('/').pop());
    let issues = readIssues();
    const exists = issues.find(i=>i.id===id);
    if (!exists) return sendJSON(res, 404, { error: 'Not found' });
    issues = issues.filter(i=>i.id!==id);
    writeIssues(issues);
    sendJSON(res, 200, { deleted: id });
    return;
  }

  // Static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════╗');
  console.log('  ║   BugTrack is running!           ║');
  console.log('  ║   http://localhost:' + PORT + '           ║');
  console.log('  ╚══════════════════════════════════╝');
  console.log('');
  console.log('  Data saved to: data/issues.json');
  console.log('  Press Ctrl+C to stop.');
});
