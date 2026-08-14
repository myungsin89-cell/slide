// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout, RefreshCw, Monitor, AlertCircle, TrendingUp, Key, Printer, RotateCcw, Clock, User, GraduationCap, ChevronRight, CheckCircle2, FileText, Image, Activity, X } from 'lucide-react';

// 배포 주소 설정
const PROD_URL = "https://slide-theta-jet.vercel.app";
const API_BASE = window.location.hostname === 'localhost' ? "http://localhost:5000/api" : `${PROD_URL}/api`;

function App() {
  const [page, setPage] = useState('landing'); 
  const [teacherTab, setTeacherTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [activeId, setActiveId] = useState(() => localStorage.getItem('activeAssignmentId') || '');
  const [title, setTitle] = useState(() => localStorage.getItem('activeTitle') || '');
  const [targetKeywords, setTargetKeywords] = useState(() => {
    try { const saved = localStorage.getItem('activeKeywords'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
  });
  
  // 로컬스토리지를 일차 저장소로 사용하여 무상태 Vercel 서버 지원
  const [userClasses, setUserClasses] = useState(() => {
    try { const saved = localStorage.getItem('userClasses'); return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
  });
  const [dashboardData, setDashboardData] = useState(() => {
    try { const saved = localStorage.getItem('slideDataStore'); return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
  });
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // 1. 구글 로그인 완료 후 URL 쿼리 파라미터 파싱
    const params = new URLSearchParams(window.location.search);
    const loginStatus = params.get('login');
    const tokenStr = params.get('token');
    
    if (loginStatus === 'success' && tokenStr) {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('googleToken', tokenStr);
      setPage('teacher');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    // 2. 대시보드 상태가 활성화되어 있으면 데이터 갱신 실행
    if (isLoggedIn && activeId) {
      fetchDashboard();
    }
  }, [isLoggedIn, activeId]);

  useEffect(() => {
    let timer;
    if (isLoggedIn && activeId && teacherTab === 'dashboard' && page === 'teacher') {
      timer = setInterval(() => { fetchDashboard(); setLastUpdate(new Date()); }, 30000);
    }
    return () => clearInterval(timer);
  }, [activeId, teacherTab, isLoggedIn, page]);

  const fetchDashboard = () => {
    if (!activeId) return;
    const token = localStorage.getItem('googleToken');
    const savedData = localStorage.getItem('slideDataStore');
    let studentDataList = [];
    try {
      studentDataList = savedData ? JSON.parse(savedData) : dashboardData;
    } catch(e) {
      studentDataList = dashboardData;
    }

    if (!studentDataList || studentDataList.length === 0) return;

    axios.post(`${API_BASE}/dashboard`, { 
      studentDataList: studentDataList, 
      keywords: targetKeywords 
    }, {
      headers: { Authorization: token }
    }).then(res => {
      const newData = res.data || [];
      setDashboardData(newData);
      localStorage.setItem('slideDataStore', JSON.stringify(newData));
      if (selectedStudent) {
        const up = newData.find(s => s.studentName === selectedStudent.studentName);
        if (up) setSelectedStudent(up);
      }
    }).catch(e => {
      console.log("대시보드 갱신 실패:", e);
      if (e.response && e.response.status === 401) {
        alert("구글 로그인 세션이 유효하지 않거나 만료되었습니다. 다시 로그인해주세요.");
        setIsLoggedIn(false);
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('googleToken');
      }
    });
  };

  const getStatusColor = (s) => ({ "정상": "#1E8E3E", "정체": "#F9AB00", "복붙의심": "#D93025" }[s] || "#9AA0A6");

  if (page === 'landing') return (
    <div style={{ backgroundColor: '#FFBB00', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', width: '90%', textAlign: 'center' }}>
        <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '15px', display: 'inline-block', marginBottom: '20px' }}><Layout color="#FFBB00" size={48} /></div>
        <h1 style={{ color: '#fff', fontSize: '42px', fontWeight: 'bold', marginBottom: '10px' }}>{"SlideSight"}</h1>
        <p style={{ color: '#fff', opacity: 0.9, marginBottom: '50px' }}>{"구글 슬라이드 기반 실시간 학습 참여 관제 시스템"}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div onClick={() => setPage('teacher')} style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '20px', cursor: 'pointer' }}>
             <Monitor size={48} color="#FFBB00" style={{marginBottom:'15px'}} />
             <h2 style={{color:'#202124'}}>{"선생님용"}</h2>
          </div>
          <div onClick={() => setPage('student')} style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '20px', cursor: 'pointer' }}>
             <GraduationCap size={48} color="#FFBB00" style={{marginBottom:'15px'}} />
             <h2 style={{color:'#202124'}}>{"학생용"}</h2>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #ddd', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor:'pointer' }} onClick={() => setPage('landing')}>
          <div style={{ backgroundColor: '#FFBB00', padding: '5px', borderRadius: '4px' }}><Layout color="#fff" size={18}/></div>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{"SlideSight"}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {page === 'teacher' && isLoggedIn && (
            <div style={{ display: 'flex', gap: '4px', background: '#f1f3f4', padding: '4px', borderRadius: '8px' }}>
              <button className="nav-btn" style={{ background: teacherTab === 'classes' ? '#fff' : 'transparent' }} onClick={() => setTeacherTab('classes')}>{"학급관리"}</button>
              <button className="nav-btn" style={{ background: teacherTab === 'dashboard' ? '#fff' : 'transparent' }} onClick={() => setTeacherTab('dashboard')}>{"관제탑"}</button>
              <button className="nav-btn" style={{ background: teacherTab === 'report' ? '#fff' : 'transparent' }} onClick={() => setTeacherTab('report')}>{"리포트"}</button>
            </div>
          )}
          <button className="nav-btn primary" onClick={() => setPage('landing')}>{"메인으로"}</button>
        </div>
      </header>
      <main style={{ maxWidth: '1100px', margin: '20px auto', padding: '0 20px' }}>
        {page === 'teacher' ? (
          <TeacherView 
            isLoggedIn={isLoggedIn} 
            tab={teacherTab} 
            userClasses={userClasses} 
            setUserClasses={setUserClasses}
            activeId={activeId} 
            title={title} 
            data={dashboardData} 
            setDashboardData={setDashboardData}
            selectedStudent={selectedStudent} 
            setSelectedStudent={setSelectedStudent} 
            lastUpdate={lastUpdate} 
            fetchDashboard={fetchDashboard} 
            targetKeywords={targetKeywords} 
            getStatusColor={getStatusColor} 
            API_BASE={API_BASE}
          />
        ) : (
          <StudentView API_BASE={API_BASE} />
        )}
      </main>
      <style>{`.card { background: #fff; border: 1px solid #ddd; padding: 24px; border-radius: 12px; margin-bottom: 20px; } .nav-btn { border: none; background: none; padding: 6px 16px; cursor: pointer; color: #5F6368; border-radius: 6px; font-size: 13px; font-weight: bold; } .nav-btn.primary { background: #FFBB00; color: #fff; font-weight: bold; } .main-btn { background: #FFBB00; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 8px; } .input { padding: 12px; border: 1px solid #ddd; border-radius: 6px; width: 100%; margin-bottom: 10px; box-sizing: border-box; }`}</style>
    </div>
  );
}

function TeacherView({ isLoggedIn, tab, userClasses, setUserClasses, activeId, title, data, setDashboardData, selectedStudent, setSelectedStudent, lastUpdate, fetchDashboard, targetKeywords, getStatusColor, API_BASE }) {
  const [nc, setNc] = useState(''); const [ns, setNs] = useState('');
  const [at, setAt] = useState(''); const [au, setAu] = useState('');
  const [ak, setAk] = useState(''); const [sl, setSl] = useState([]);

  if (!isLoggedIn) return <div className="card" style={{textAlign:'center'}}><button className="main-btn" style={{margin:'0 auto'}} onClick={() => window.location.href = `${API_BASE}/auth/google`}>{"구글 연동 시작"}</button></div>;

  if (tab === 'classes') return (
    <div className="card">
      <h3>{"학급 및 명단 관리"}</h3>
      <input className="input" style={{marginTop:'15px'}} placeholder="반 이름" value={nc} onChange={e => setNc(e.target.value)} />
      <textarea className="input" placeholder="학생 명단 (쉼표 구분)" value={ns} onChange={e => setNs(e.target.value)} rows="3" />
      <button className="main-btn" onClick={() => {
        if (!nc || !ns) { alert("반 이름 and 학생 명단을 입력해 주세요."); return; }
        const id = "class_" + Date.now();
        const updated = { ...userClasses, [id]: { classId: id, className: nc, students: ns.split(',').map(v => v.trim()).filter(v => v) } };
        setUserClasses(updated);
        localStorage.setItem('userClasses', JSON.stringify(updated));
        alert("저장 완료");
        setNc('');
        setNs('');
      }}>{"저장"}</button>
      <div style={{marginTop:'30px'}}>{Object.values(userClasses).map(c => <div key={c.classId} style={{padding:'10px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between'}}><strong>{c.className}</strong>: {c.students.join(', ')}</div>)}</div>
    </div>
  );

  if (tab === 'dashboard') {
    if (!activeId) return (
      <div className="card">
        <h2>{"🚀 새 수업 배부"}</h2>
        <input className="input" style={{marginTop:'15px'}} placeholder="과제 제목" value={at} onChange={e => setAt(e.target.value)} />
        <input className="input" placeholder="원본 슬라이드 URL" value={au} onChange={e => setAu(e.target.value)} />
        <input className="input" placeholder="핵심어 (쉼표 구분)" value={ak} onChange={e => setAk(e.target.value)} />
        <div style={{background:'#F8F9FA', padding:'20px', borderRadius:'12px'}}>
          <p style={{fontWeight:'bold', marginBottom:'10px'}}>{"대상 선택"}</p>
          {Object.values(userClasses).map(c => (
            <div key={c.classId} style={{marginBottom:'10px'}}>
              <div style={{fontSize:'12px', color:'#FFBB00', fontWeight:'bold'}}>{c.className}</div>
              {c.students.map(n => {
                const isS = sl.some(i => i.name === n && i.className === c.className);
                return <button key={n} onClick={() => { if(isS) setSl(sl.filter(i => !(i.name === n && i.className === c.className))); else setSl([...sl, {name:n, className:c.className}]); }} style={{margin:'2px', padding:'4px 10px', backgroundColor: isS ? '#FFBB00' : '#fff', color: isS ? '#fff' : '#666', borderRadius:'20px', border:'1px solid #ddd', fontSize:'12px', cursor:'pointer'}}>{n}</button>;
              })}
            </div>
          ))}
          <button className="main-btn" style={{width:'100%', marginTop:'20px', justifyContent:'center'}} onClick={async () => {
            if (!at || !au || sl.length === 0) {
              alert("과제 제목, 템플릿 URL, 배부 대상을 모두 채워주세요.");
              return;
            }
            try {
              const token = localStorage.getItem('googleToken');
              const res = await axios.post(`${API_BASE}/assignment`, { 
                title: at, 
                templateUrl: au, 
                keywords: ak, 
                studentList: sl 
              }, {
                headers: { Authorization: token }
              });
              
              const { assignment, studentDataList } = res.data;
              
              localStorage.setItem('activeAssignmentId', assignment.assignmentId);
              localStorage.setItem('activeTitle', at);
              localStorage.setItem('activeKeywords', JSON.stringify(assignment.keywords));
              localStorage.setItem('slideDataStore', JSON.stringify(studentDataList));
              
              window.location.reload();
            } catch(e) {
              alert("배부 실패: " + (e.response?.data?.error || e.message));
            }
          }}>{"배부 시작"}</button>
        </div>
      </div>
    );

    return (
      <div>
        <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderLeft:'8px solid #FFBB00'}}>
          <div><strong>{title}</strong> <span style={{color:'#FFBB00', fontWeight:'bold'}}>{"[ 코드: "}{activeId}{" ]"}</span></div>
          <div style={{display:'flex', gap:'8px'}}>
            <button className="nav-btn" onClick={() => {
              const linkListText = (data || []).map(s => `[${s.className} ${s.studentName}] ${s.slideUrl}`).join('\n');
              navigator.clipboard.writeText(linkListText);
              alert("모든 학생의 슬라이드 링크가 클립보드에 복사되었습니다!");
            }} style={{background:'#f1f3f4'}}>{"링크 전체 복사"}</button>
            <button className="nav-btn" onClick={() => { 
              localStorage.removeItem('activeAssignmentId');
              localStorage.removeItem('activeTitle');
              localStorage.removeItem('activeKeywords');
              localStorage.removeItem('slideDataStore');
              window.location.reload(); 
            }} style={{color:'#D93025'}}>{"종료"}</button>
          </div>
        </div>
        <div className="card">
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'15px'}}>
            {(data || []).map(s => (
              <div key={s.studentName} onClick={() => setSelectedStudent(s)} style={{padding:'20px', borderRadius:'12px', background: getStatusColor(s.status), color: s.status === '미시작' ? '#5f6368' : '#fff', textAlign:'center', cursor:'pointer', border: selectedStudent?.studentName === s.studentName ? '5px solid #202124' : 'none'}}>
                <div style={{fontWeight:'bold', fontSize:'18px'}}>{s.studentName}</div>
                <div style={{fontSize:'11px'}}>{s.wordCount}{"자"}</div>
              </div>
            ))}
          </div>
        </div>
        {selectedStudent && (
          <div className="card" style={{borderTop:`15px solid ${getStatusColor(selectedStudent.status)}`, padding:'40px'}}>
            <h2>{selectedStudent.studentName}{" 상세분석"}</h2>
            <div className="grid" style={{gridTemplateColumns:'repeat(4, 1fr)', gap:'20px', marginTop:'20px'}}>
              <div style={{background:'#F8F9FA', padding:'20px', borderRadius:'12px', textAlign:'center'}}><div>{"분량"}</div><strong>{selectedStudent.wordCount}{"자"}</strong></div>
              <div style={{background:'#F8F9FA', padding:'20px', borderRadius:'12px', textAlign:'center'}}><div>{"장수"}</div><strong>{selectedStudent.slideCount}{"장"}</strong></div>
              <div style={{background:'#F8F9FA', padding:'20px', borderRadius:'12px', textAlign:'center'}}><div>{"이미지"}</div><strong>{selectedStudent.imageCount}{"개"}</strong></div>
              <div style={{background:'#F8F9FA', padding:'20px', borderRadius:'12px', textAlign:'center'}}><div>{"핵심어"}</div><strong>{selectedStudent.foundKeywords.length}{"/"}{targetKeywords.length}</strong></div>
            </div>
            <div style={{height:'120px', display:'flex', alignItems:'flex-end', gap:'3px', background:'#f1f3f4', padding:'15px', borderRadius:'12px', marginTop:'20px'}}>
               {selectedStudent.history?.map((h, i, arr) => <div key={i} style={{flex:1, background: h.wordCount > (arr[i-1]?.wordCount || 0) ? '#FFBB00' : '#cbd5e1', height:`${Math.max(10, (h.wordCount/(selectedStudent.wordCount || 100))*100)}%`, borderRadius:'2px'}}></div>)}
            </div>
            <button className="main-btn" style={{width:'100%', marginTop:'20px'}} onClick={() => window.open(selectedStudent.slideUrl)}>{"슬라이드 열기 ➜"}</button>
          </div>
        )}
      </div>
    );
  }

  if (tab === 'report') return (
    <div className="card">
       <h2>{"종합 리포트"}</h2>
       {data.map(s => (
         <div key={s.studentName} style={{padding:'15px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between'}}>
           <strong>{s.studentName}</strong>
           <span>{s.wordCount}{"자 / "}{s.slideCount}{"장 / 이미지 "}{s.imageCount}{"개"}</span>
         </div>
       ))}
       <button className="main-btn" style={{marginTop:'30px'}} onClick={() => window.print()}>{"인쇄하기"}</button>
    </div>
  );
  return null;
}

function StudentView({ API_BASE }) {
  const [c, setC] = useState(''); const [n, setN] = useState('');
  return (
    <div className="card" style={{maxWidth:'450px', margin:'80px auto', textAlign:'center', padding:'50px'}}>
      <h2 style={{fontSize:'28px', marginBottom:'40px'}}>{"학생 접속"}</h2>
      <input className="input" style={{textAlign:'center', fontSize:'36px', fontWeight:'bold', color:'#FFBB00', letterSpacing:'10px'}} placeholder="0000" value={c} onChange={e => setC(e.target.value.replace(/[^0-9]/g, '').slice(0,4))} />
      <input className="input" style={{textAlign:'center', marginTop:'10px'}} placeholder="이름 입력" value={n} onChange={e => setN(e.target.value)} />
      <button className="main-btn" style={{width:'100%', marginTop:'20px', justifyContent:'center', fontSize:'20px'}} onClick={async () => {
        try { const res = await axios.get(`${API_BASE}/student/access`, { params: { code: c, name: n } }); window.open(res.data.slideUrl); } catch(e) { alert(e.response?.data?.error || "확인 실패"); }
      }}>{"내 슬라이드 열기 🚀"}</button>
    </div>
  );
}

export default App;