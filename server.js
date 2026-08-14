const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// 배포 주소 강제 설정
const PROD_URL = "https://slide-theta-jet.vercel.app";

// CORS 설정을 유연하게 수정 (모든 오리진 허용 또는 PROD_URL/localhost 허용)
app.use(cors({
  origin: function(origin, callback) {
    callback(null, true); // 코딩 대회 배포 편의성을 위해 모든 CORS 통과 허용
  },
  credentials: true
}));
app.use(express.json());

// ─── [ 데이터베이스: JSON 파일 관리 (로컬용 하위 호환 유지) ] ───
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);

function writeDb(name, data) {
  try {
    fs.writeFileSync(path.join(DB_DIR, name), JSON.stringify(data, null, 2));
  } catch (e) {
    // Vercel 서버리스 등 read-only 환경에서 에러 방지
  }
}
function readDb(name, def = {}) {
  try {
    const p = path.join(DB_DIR, name);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : def;
  } catch (e) {
    return def;
  }
}

// ─── [ 구글 OAuth2 설정: 환경변수가 있으면 우선 적용, 없으면 기본값 ] ───
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || (
    process.env.NODE_ENV === 'production' 
      ? `${PROD_URL}/api/auth/google/callback` 
      : "http://localhost:5000/api/auth/google/callback"
  )
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
    
    // 로컬 저장은 하위 호환용으로만 남기고 에러 무시
    writeDb('token.json', tokens);
    
    // 토큰 값을 안전하게 직렬화/인코딩하여 리다이렉트 주소 파라미터로 실어보냄
    const tokenStr = encodeURIComponent(JSON.stringify(tokens));
    const redirectTarget = process.env.NODE_ENV === 'production' 
      ? `${PROD_URL}/?login=success&token=${tokenStr}` 
      : `http://localhost:5173/?login=success&token=${tokenStr}`;
      
    res.redirect(redirectTarget);
  } catch (err) { 
    const failTarget = process.env.NODE_ENV === 'production' 
      ? `${PROD_URL}/?login=fail` 
      : `http://localhost:5173/?login=fail`;
    res.redirect(failTarget); 
  }
});

// ─── [ 학급 관리 API (더 이상 쓰지 않음, 로컬용 구버전 호환만 유지) ] ───
app.get('/api/classes', (req, res) => {
  const userClasses = readDb('userClasses.json', {});
  res.json(userClasses);
});
app.post('/api/classes', (req, res) => {
  const { className, students } = req.body;
  const id = "class_" + Date.now();
  const userClasses = readDb('userClasses.json', {});
  userClasses[id] = { classId: id, className, students };
  writeDb('userClasses.json', userClasses);
  res.json({ id });
});

// ─── [ 과제 생성 및 할당 API: 무상태(Stateless)로 변경 ] ───
app.post('/api/assignment', async (req, res) => {
  const { title, templateUrl, keywords, studentList } = req.body;
  
  // 브라우저가 넘겨준 구글 토큰을 헤더에서 획득
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "로그인 필요" });
  
  let localToken;
  try {
    localToken = JSON.parse(authHeader);
  } catch (e) {
    return res.status(401).json({ error: "유효하지 않은 로그인 토큰 형식" });
  }

  try {
    oauth2Client.setCredentials(localToken);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const templateId = templateUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (!templateId) return res.status(400).json({ error: "올바르지 않은 구글 슬라이드 URL 양식입니다." });
    
    const assignmentId = Math.floor(1000 + Math.random() * 9000).toString();
    const keywordArray = keywords ? keywords.split(',').map(k => k.trim()) : [];
    
    const newAssignment = { assignmentId, title, templateUrl, keywords: keywordArray, createdAt: new Date() };
    const newStudentsData = [];

    for (const student of studentList) {
      const copy = await drive.files.copy({ fileId: templateId, requestBody: { name: `[${student.className}_${student.name}] ${title}` } });
      await drive.permissions.create({ fileId: copy.data.id, requestBody: { role: 'writer', type: 'anyone' } });
      
      newStudentsData.push({
        assignmentId,
        studentName: student.name,
        className: student.className,
        slideId: copy.data.id,
        slideUrl: `https://docs.google.com/presentation/d/${copy.data.id}/edit`,
        slideCount: 0,
        wordCount: 0,
        imageCount: 0,
        shapeCount: 0,
        foundKeywords: [],
        status: "미시작",
        activityLog: "준비",
        history: [],
        lastUpdated: new Date()
      });
    }
    
    // 로컬 하위 호환 백업
    const assignments = readDb('assignments.json', {});
    assignments[assignmentId] = newAssignment;
    writeDb('assignments.json', assignments);
    
    const slideDataStore = readDb('slideDataStore.json', {});
    newStudentsData.forEach(d => {
      slideDataStore[`${assignmentId}_${d.studentName}`] = d;
    });
    writeDb('slideDataStore.json', slideDataStore);

    // 생성된 데이터 결과를 프론트엔드로 전부 반환 (프론트엔드 로컬스토리지에 저장 목적)
    res.json({ assignment: newAssignment, studentDataList: newStudentsData });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ─── [ 대시보드 실시간 분석 API: POST 무상태(Stateless)로 변경 ] ───
app.post('/api/dashboard', async (req, res) => {
  const { studentDataList, keywords } = req.body;
  
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "로그인 필요" });
  
  let localToken;
  try {
    localToken = JSON.parse(authHeader);
  } catch (e) {
    return res.status(401).json({ error: "유효하지 않은 로그인 토큰 형식" });
  }

  try {
    oauth2Client.setCredentials(localToken);
    const slidesApi = google.slides({ version: 'v1', auth: oauth2Client });
    
    const updatedDataList = [];

    for (const s of studentDataList) {
      try {
        const resSlide = await slidesApi.presentations.get({ presentationId: s.slideId });
        const slides = resSlide.data.slides || [];
        let w = 0, i = 0, sh = 0, txt = "";
        
        slides.forEach(p => {
          (p.pageElements || []).forEach(el => {
            if (el.image) i++;
            if (el.shape) {
              sh++;
              (el.shape.text?.textElements || []).forEach(te => { 
                if (te.textRun?.content) { 
                  w += te.textRun.content.trim().length; 
                  txt += te.textRun.content; 
                } 
              });
            }
          });
        });
        
        const targetKeywords = keywords || [];
        const fk = targetKeywords.filter(kw => txt.includes(kw));
        let status = "정상", log = "진행 중";
        const prevW = s.wordCount || 0;
        
        if (w === 0) { 
          status = "미시작"; 
          log = "대기"; 
        } else if (w > prevW + 150) { 
          status = "복붙의심"; 
          log = "급증🚩"; 
        } else if (new Date() - new Date(s.lastUpdated) > 600000) { 
          status = "정체"; 
          log = "10분 정체🟡"; 
        }
        
        const newHistory = [...(s.history || []), { time: new Date(), wordCount: w }];
        
        updatedDataList.push({
          ...s,
          slideCount: slides.length,
          wordCount: w,
          imageCount: i,
          shapeCount: sh,
          foundKeywords: fk,
          status,
          activityLog: log,
          lastUpdated: new Date(),
          history: newHistory.slice(-20)
        });
      } catch (e) {
        // 오류 시 이전 데이터 그대로 복사
        updatedDataList.push(s);
      }
    }
    
    // 로컬 하위 호환 백업
    const slideDataStore = readDb('slideDataStore.json', {});
    updatedDataList.forEach(d => {
      slideDataStore[`${d.assignmentId}_${d.studentName}`] = d;
    });
    writeDb('slideDataStore.json', slideDataStore);

    res.json(updatedDataList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 하위 호환용 기존 GET 대시보드 API 유지 (필요 시 에러방지)
app.get('/api/dashboard/:assignmentId', (req, res) => {
  const { assignmentId } = req.params;
  const slideDataStore = readDb('slideDataStore.json', {});
  const keys = Object.keys(slideDataStore).filter(k => k.startsWith(assignmentId));
  res.json(keys.map(k => slideDataStore[k]));
});

// ─── [ 학생 접속 API (로컬 파일 및 전달 파라미터 백업 조회) ] ───
app.get('/api/student/access', (req, res) => {
  const { code, name } = req.query;
  const slideDataStore = readDb('slideDataStore.json', {});
  const data = slideDataStore[`${code}_${name}`];
  if (data) {
    res.json({ slideUrl: data.slideUrl });
  } else {
    res.status(404).json({ error: "해당 학생의 슬라이드를 찾을 수 없습니다. 선생님께 개별 링크를 직접 문의해 주세요." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));