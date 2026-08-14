const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// 배포 주소 강제 설정
const PROD_URL = "https://slide-theta-jet.vercel.app";
const origin = process.env.NODE_ENV === 'production' ? PROD_URL : "http://localhost:5173";

app.use(cors({ origin: origin, credentials: true }));
app.use(express.json());

// ─── [ 데이터베이스: JSON 파일 관리 ] ───
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);

function writeDb(name, data) { fs.writeFileSync(path.join(DB_DIR, name), JSON.stringify(data, null, 2)); }
function readDb(name, def = {}) {
  const p = path.join(DB_DIR, name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : def;
}

let teacherToken = readDb('token.json', null);
let assignments = readDb('assignments.json', {});
let slideDataStore = readDb('slideDataStore.json', {});
let userClasses = readDb('userClasses.json', {});

// ─── [ 구글 OAuth2 설정: 알려주신 주소로 강제 지정 ] ───
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production' 
    ? `${PROD_URL}/api/auth/google/callback` 
    : "http://localhost:5000/api/auth/google/callback"
);

app.get('/api/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({ 
    access_type: 'offline', 
    scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/presentations'], 
    prompt: 'consent' 
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    teacherToken = tokens;
    writeDb('token.json', tokens);
    
    const redirectTarget = process.env.NODE_ENV === 'production' 
      ? `${PROD_URL}/?login=success` 
      : "http://localhost:5173/?login=success";
      
    res.redirect(redirectTarget);
  } catch (err) { 
    res.redirect(process.env.NODE_ENV === 'production' 
      ? `${PROD_URL}/?login=fail` 
      : "http://localhost:5173/?login=fail"); 
  }
});

// ─── [ 학급 관리 API ] ───
app.get('/api/classes', (req, res) => res.json(userClasses));
app.post('/api/classes', (req, res) => {
  const { className, students } = req.body;
  const id = "class_" + Date.now();
  userClasses[id] = { classId: id, className, students };
  writeDb('userClasses.json', userClasses);
  res.json({ id });
});

// ─── [ 과제 생성 및 할당 API ] ───
app.post('/api/assignment', async (req, res) => {
  const { title, templateUrl, keywords, studentList } = req.body;
  if (!teacherToken) return res.status(401).json({ error: "로그인 필요" });
  try {
    oauth2Client.setCredentials(teacherToken);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const templateId = templateUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    
    let assignmentId;
    do { assignmentId = Math.floor(1000 + Math.random() * 9000).toString(); } while (assignments[assignmentId]);

    const keywordArray = keywords ? keywords.split(',').map(k => k.trim()) : [];
    assignments[assignmentId] = { assignmentId, title, templateUrl, keywords: keywordArray, createdAt: new Date() };
    writeDb('assignments.json', assignments);

    for (const student of studentList) {
      const copy = await drive.files.copy({ fileId: templateId, requestBody: { name: `[${student.className}_${student.name}] ${title}` } });
      await drive.permissions.create({ fileId: copy.data.id, requestBody: { role: 'writer', type: 'anyone' } });
      slideDataStore[`${assignmentId}_${student.name}`] = { assignmentId, studentName: student.name, className: student.className, slideId: copy.data.id, slideUrl: `https://docs.google.com/presentation/d/${copy.data.id}/edit`, slideCount: 0, wordCount: 0, imageCount: 0, shapeCount: 0, foundKeywords: [], status: "미시작", activityLog: "준비", history: [], lastUpdated: new Date() };
    }
    writeDb('slideDataStore.json', slideDataStore);
    res.json({ assignmentId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/:assignmentId', async (req, res) => {
  const { assignmentId } = req.params;
  if (!teacherToken) return res.status(401).json({ error: "로그인 필요" });
  oauth2Client.setCredentials(teacherToken);
  const slidesApi = google.slides({ version: 'v1', auth: oauth2Client });
  const keys = Object.keys(slideDataStore).filter(k => k.startsWith(assignmentId));
  for (const key of keys) {
    const s = slideDataStore[key];
    try {
      const resSlide = await slidesApi.presentations.get({ presentationId: s.slideId });
      const slides = resSlide.data.slides || [];
      let w = 0, i = 0, sh = 0, txt = "";
      slides.forEach(p => {
        (p.pageElements || []).forEach(el => {
          if (el.image) i++;
          if (el.shape) {
            sh++;
            (el.shape.text?.textElements || []).forEach(te => { if (te.textRun?.content) { w += te.textRun.content.trim().length; txt += te.textRun.content; } });
          }
        });
      });
      const targetKeywords = assignments[assignmentId]?.keywords || [];
      const fk = targetKeywords.filter(kw => txt.includes(kw));
      let status = "정상", log = "진행 중";
      const prevW = s.wordCount || 0;
      if (w === 0) { status = "미시작"; log = "대기"; }
      else if (w > prevW + 150) { status = "복붙의심"; log = "급증🚩"; }
      else if (new Date() - new Date(s.lastUpdated) > 600000) { status = "정체"; log = "10분 정체🟡"; }
      const newHistory = [...(s.history || []), { time: new Date(), wordCount: w }];
      slideDataStore[key] = { ...s, slideCount: slides.length, wordCount: w, imageCount: i, shapeCount: sh, foundKeywords: fk, status, activityLog: log, lastUpdated: new Date(), history: newHistory.slice(-20) };
    } catch (e) {}
  }
  writeDb('slideDataStore.json', slideDataStore);
  res.json(keys.map(k => slideDataStore[k]));
});

app.get('/api/student/access', (req, res) => {
  const { code, name } = req.query;
  const data = slideDataStore[`${code}_${name}`];
  if (data) res.json({ slideUrl: data.slideUrl });
  else res.status(404).json({ error: "찾을 수 없음" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));