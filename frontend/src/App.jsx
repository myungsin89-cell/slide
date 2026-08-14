// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Layout, RefreshCw, Monitor, AlertCircle, TrendingUp, Key, Printer, 
  RotateCcw, Clock, FileText, Image, CheckCircle2, X, UserPlus, Users, Activity
} from 'lucide-react';

const API_BASE = "http://localhost:5000/api";

function App() {
  const [page, setPage] = useState('landing'); 
  const [teacherTab, setTeacherTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [activeId, setActiveId] = useState(() => localStorage.getItem('activeAssignmentId') || '');
  const [title, setTitle] = useState(() => localStorage.getItem('activeTitle') || '');
  const [targetKeywords, setTargetKeywords] = useState(() => {
    try {
      const saved = localStorage.getItem('activeKeywords');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [userClasses, setUserClasses] = useState({});
  const [dashboardData, setDashboardData] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (isLoggedIn) {
      axios.get(`${API_BASE}/classes`).then(res => setUserClasses(res.data)).catch(e => console.log(e));
      if (activeId) fetchDashboard();
    }
    if (window.location.search.includes('success')) {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
      setPage('teacher');
      window.history.replaceState({}, '', '/');
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
    axios.get(`${API_BASE}/dashboard/${activeId}`).then(res => {
      const newData = res.data || [];
      setDashboardData(newData);
      if (selectedStudent) {
        const up = newData.find(s => s.studentName === selectedStudent.studentName);
        if (up) setSelectedStudent(up);
      }
    }).catch(e => console.log(e));
  };

  const getStatusColor = (s) => {
    if (s === "정상") return "#1E8E3E";
    if (s === "정체") return "#F9AB00";
    if (s === "복붙의심") return "#D93025";
    return "#9AA0A6";
  };

  // 메인 렌더링 로직
  if (page === 'landing') {
    return (
      <div style={{ backgroundColor: '#FFBB00', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: '800px', width: '90%', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '15px', display: 'inline-block', marginBottom: '20px' }}><Layout color="#FFBB00" size={48} /></div>
          <h1 style={{ color: '#fff', fontSize: '42px', fontWeight: 'bold' }}>{"SlideSight"}</h1>
          <p style={{ color: '#fff', opacity: 0.9, marginBottom: '50px' }}>{"구글 슬라이드 기반 실시간 학습 참여 관제 시스템"}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div onClick={() => setPage('teacher')} style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '20px', cursor: 'pointer' }}>
               <Monitor size={48} color="#FFBB00" style={{marginBottom:'15px'}} />
               <h2 style={{color:'#202124'}}>{"선생님용"}</h2>
            </div>
            <div onClick={() => setPage('student')} style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '20px', cursor: 'pointer' }}>
               <Activity size={48} color="#FFBB00" style={{marginBottom:'15px'}} />
               <h2 style={{color:'#202124'}}>{"학생용"}</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <TeacherView isLoggedIn={isLoggedIn} tab={teacherTab} userClasses={userClasses} activeId={activeId} title={title} data={dashboardData} selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent} lastUpdate={lastUpdate} fetchDashboard={fetchDashboard} targetKeywords={targetKeywords} getStatusColor={getStatusColor} />
        ) : (
          <StudentView />
        )}
      </main>

      <style>{`
        .card { background: #fff; border: 1px solid #ddd; padding: 24px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .nav-btn { border: none; background: none; padding: 6px 16px; cursor: pointer; color: #5F6368; border-radius: 6px; font-size: 13px; font-weight: bold; }
        .nav-btn.primary { background: #FFBB00; color: #fff; font-weight: bold; }
        .main-btn { background: #FFBB00; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 8px; }
        .input { padding: 12px; border: 1px solid #ddd; border-radius: 6px; width: 100%; margin-bottom: 10px; box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function TeacherView({ isLoggedIn, tab, userClasses, activeId, title, data, selectedStudent, setSelectedStudent, lastUpdate, fetchDashboard, targetKeywords, getStatusColor }) {
  const [nc, setNc] = useState(''); const [ns, setNs] = useState('');
  const [at, setAt] = useState(''); const [au, setAu] = useState('');
  const [ak, setAk] = useState(''); const [sl, setSl] = useState([]);

  if (!isLoggedIn) return <div className="card" style={{textAlign:'center'}}><button className="main-btn" style={{margin:'0 auto'}} onClick={() => window.location.href = `${API_BASE}/auth/google`}>{"구글 연동 시작"}</button></div>;

  if (tab === 'classes') return (
    <div className="card">
      <h3>{"학급 및 명단 관리"}</h3>
      <input className="input" style={{marginTop:'15px'}} placeholder="반 이름" value={nc} onChange={e => setNc(e.target.value)} />
      <textarea className="input" placeholder="학생 명단 (쉼표 구분)" value={ns} onChange={e => setNs(e.target.value)} rows="3" />
      <button className="main-btn" onClick={async () => {
        await axios.post(`${API_BASE}/classes`, { className: nc, students: ns.split(',').map(v => v.trim()).filter(v => v) });
        alert("저장 완료"); window.location.reload();
      }}>{"학급 명단 등록"}</button>
      <div style={{marginTop:'30px'}}>
        {Object.values(userClasses).map(c => <div key={c.classId} style={{padding:'12px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between'}}><strong>{c.className}</strong> <span>{c.students.length}{"명"}</span></div>)}
      </div>
    </div>
  );

  if (tab === 'dashboard') {
    if (!activeId) return (
      <div className="card">
        <h3>{"새 수업 과제 배부"}</h3>
        <input className="input" style={{marginTop:'15px'}} placeholder="과제 제목" value={at} onChange={e => setAt(e.target.value)} />
        <input className="input" placeholder="원본 슬라이드 URL" value={au} onChange={e => setAu(e.target.value)} />
        <input className="input" placeholder="핵심어 (쉼표 구분)" value={ak} onChange={e => setAk(e.target.value)} />
        <div style={{background:'#F8F9FA', padding:'25px', borderRadius:'12px', marginTop:'10px'}}>
          <p style={{fontWeight:'bold', marginBottom:'10px'}}>{"배부 대상 선택"}</p>
          {Object.values(userClasses).map(c => (
            <div key={c.classId} style={{marginBottom:'15px'}}>
              <div style={{fontSize:'12px', color:'#FFBB00', fontWeight:'bold'}}>{c.className}</div>
              {c.students.map(n => {
                const isS = sl.some(i => i.name === n && i.className === c.className);
                return <button key={n} onClick={() => { if(isS) setSl(sl.filter(i => !(i.name === n && i.className === c.className))); else setSl([...sl, {name:n, className:c.className}]); }} style={{margin:'2px', padding:'5px 12px', backgroundColor: isS ? '#FFBB00' : '#fff', color: isS ? '#fff' : '#666', borderRadius:'20px', border:'1px solid #ddd', fontSize:'12px', cursor:'pointer'}}>{n}</button>;
              })}
            </div>
          ))}
          <button className="main-btn" style={{width:'100%', marginTop:'20px', justifyContent:'center'}} onClick={async () => {
            const res = await axios.post(`${API_BASE}/assignment`, { title: at, templateUrl: au, keywords: ak, studentList: sl });
            localStorage.setItem('activeAssignmentId', res.data.assignmentId);
            localStorage.setItem('activeTitle', at);
            localStorage.setItem('activeKeywords', JSON.stringify(ak.split(',').map(k => k.trim())));
            window.location.reload();
          }}>{"배부 및 자동 관제 가동"}</button>
        </div>
      </div>
    );

    const urgent = (data || []).filter(s => s.status === '정체' || s.status === '복붙의심');

    return (
      <div>
        <div className="card" style={{display:'flex', gap:'25px', fontSize:'13px', borderLeft:'10px solid #FFBB00'}}>
          <div style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:10, height:10, borderRadius:'50%', background:'#1E8E3E'}}></div>정상</div>
          <div style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:10, height:10, borderRadius:'50%', background:'#F9AB00'}}></div>정체</div>
          <div style={{display:'flex', alignItems:'center', gap:'6px'}}><div style={{width:10, height:10, borderRadius:'50%', background:'#D93025'}}></div>복붙</div>
          <div style={{marginLeft:'auto', color:'#666'}}><Clock size={14} style={{verticalAlign:'middle'}}/> {"자동갱신 중: "}{lastUpdate.toLocaleTimeString()}</div>
        </div>

        {urgent.length > 0 && (
          <div className="card" style={{border:`2px solid #D93025`, background:'#FEF7F7'}}>
            <h4 style={{color:'#D93025', display:'flex', alignItems:'center', gap:'6px', marginBottom:'15px'}}><AlertCircle size={20}/> {"집중 피드백 권장 학생"}</h4>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'12px'}}>
              {urgent.map(s => (
                <div key={s.studentName} onClick={() => setSelectedStudent(s)} style={{background:'#fff', padding:'15px', borderRadius:'10px', borderLeft:`10px solid ${getStatusColor(s.status)}`, cursor:'pointer'}}>
                  <strong>{s.studentName}</strong>
                  <div style={{fontSize:'12px', color:'#D93025', marginTop:'8px', background:'#fee2e2', padding:'6px', borderRadius:'4px'}}><strong>{"진단:"}</strong> {s.activityLog}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
             <h3>{"수업 참여 현황판"}</h3>
             <button className="nav-btn" onClick={() => { if(window.confirm("수업을 종료합니까?")) { localStorage.clear(); window.location.reload(); } }} style={{color:'#D93025'}}>{"수업종료"}</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'15px'}}>
            {(data || []).map(s => (
              <div key={s.studentName} onClick={() => setSelectedStudent(s)} style={{padding:'20px', borderRadius:'15px', background: getStatusColor(s.status), color: s.status === '미시작' ? '#5f6368' : '#fff', textAlign:'center', cursor:'pointer', border: selectedStudent?.studentName === s.studentName ? '5px solid #202124' : 'none', transition:'all 0.2s'}}>
                <div style={{fontWeight:'bold', fontSize:'18px'}}>{s.studentName}</div>
                <div style={{fontSize:'11px', opacity: 0.9, marginTop:'5px'}}>{s.wordCount}{"자 작성"}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedStudent && <StudentDetail selectedStudent={selectedStudent} targetKeywords={targetKeywords} getStatusColor={getStatusColor} />}
      </div>
    );
  }

  if (tab === 'report') return (
    <div className="card">
       <h2>{"종합 성취 분석 리포트"}</h2>
       <div style={{display:'flex', flexDirection:'column', gap:'15px', marginTop:'25px'}}>
          {(data || []).map(s => (
            <div key={s.studentName} style={{padding:'20px', borderLeft:`12px solid ${getStatusColor(s.status)}`, background:'#F8F9FA', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
               <div>
                  <h3 style={{fontSize:'20px'}}>{s.studentName}</h3>
                  <div style={{fontSize:'12px', color:'#666', marginTop:'5px'}}>{s.activityLog}</div>
               </div>
               <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'18px', fontWeight:'bold'}}>{s.wordCount}{"자 / "}{s.slideCount}{"장"}</div>
                  <div style={{fontSize:'12px', color:'#999'}}>{"이미지 "}{s.imageCount}{"개 / 핵심어 "}{s.foundKeywords.length}{"개"}</div>
               </div>
            </div>
          ))}
       </div>
       <button className="main-btn" style={{marginTop:'30px'}} onClick={() => window.print()}>{"리포트 전체 인쇄"}</button>
    </div>
  );
  return null;
}

// ─── [ 상세 분석 판넬 컴포넌트 - 그래프 수리 완료 ] ───
function StudentDetail({ selectedStudent, targetKeywords, getStatusColor }) {
  // 안전한 데이터 추출
  const history = selectedStudent.history && selectedStudent.history.length > 0 ? selectedStudent.history : [{wordCount: 0}];
  // 최대값 계산 (에러 방지용 50 기본값)
  const maxWord = Math.max(...history.map(h => h.wordCount || 0), 50);

  return (
    <div className="card" style={{borderTop:`15px solid ${getStatusColor(selectedStudent.status)}`, animation: 'fadeIn 0.4s', padding:'40px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: '35px'}}>
        <div>
          <h2 style={{fontSize:'32px'}}>{selectedStudent.studentName} <span style={{fontSize:'18px', color:'#666', fontWeight:'normal'}}>{"상세 몰입 분석"}</span></h2>
          <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'10px', padding:'8px 16px', background:'#F1F3F4', borderRadius:'30px', width:'fit-content'}}>
            <TrendingUp size={20} color={getStatusColor(selectedStudent.status)}/> 
            <span style={{fontWeight:'bold', color:getStatusColor(selectedStudent.status)}}>{selectedStudent.activityLog}</span>
          </div>
        </div>
        <button className="main-btn" onClick={() => window.open(selectedStudent.slideUrl)}>{"슬라이드 열기 ➜"}</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'20px', marginBottom:'40px'}}>
        <div style={{background:'#F8F9FA', padding:'20px', borderRadius:'12px', textAlign:'center', border:'1px solid #eee'}}>
          <FileText size={20} color="#4285F4" style={{marginBottom:'5px'}}/>
          <div style={{fontSize:'11px', color:'#666'}}>{"작성 분량"}</div>
          <strong>{selectedStudent.wordCount}{" 자"}</strong>
        </div>
        <div style={{background:'#F8F9FA', padding:'20px', borderRadius:'12px', textAlign:'center', border:'1px solid #eee'}}>
          <Layout size={20} color="#34A853" style={{marginBottom:'5px'}}/>
          <div style={{fontSize:'11px', color:'#666'}}>{"슬라이드"}</div>
          <strong>{selectedStudent.slideCount}{" 장"}</strong>
        </div>
        <div style={{background:'#F8F9FA', padding:'20px', borderRadius:'12px', textAlign:'center', border:'1px solid #eee'}}>
          <Image size={20} color="#EA4335" style={{marginBottom:'5px'}}/>
          <div style={{fontSize:'11px', color:'#666'}}>{"이미지/개체"}</div>
          <strong>{selectedStudent.imageCount + selectedStudent.shapeCount}{" 개"}</strong>
        </div>
        <div style={{background:'#F8F9FA', padding:'20px', borderRadius:'12px', textAlign:'center', border:'1px solid #eee'}}>
          <Key size={20} color="#FBBC05" style={{marginBottom:'5px'}}/>
          <div style={{fontSize:'11px', color:'#666'}}>{"핵심어 도달"}</div>
          <strong>{selectedStudent.foundKeywords.length}{" / "}{targetKeywords.length}</strong>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1.8fr 1fr', gap:'40px'}}>
         {/* 꺾은선 몰입 궤적 그래프 */}
         <div>
            <h4 style={{fontSize:'16px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'8px'}}><Activity size={18} color="#FFBB00"/> {"학습 참여 몰입 궤적 (Engagement)"}</h4>
            <div style={{height:'150px', display:'flex', alignItems:'flex-end', gap:'5px', background:'#f8fafc', padding:'20px', borderRadius:'15px', border:'1px solid #e2e8f0', position:'relative', overflow:'hidden'}}>
              {/* 격자 배경 */}
              <div style={{position:'absolute', top:'25%', left:0, width:'100%', borderTop:'1px dashed #eee'}}></div>
              <div style={{position:'absolute', top:'50%', left:0, width:'100%', borderTop:'1px dashed #eee'}}></div>
              <div style={{position:'absolute', top:'75%', left:0, width:'100%', borderTop:'1px dashed #eee'}}></div>
              
              {history.map((h, i) => {
                const hVal = Math.max(8, (h.wordCount / maxWord) * 100);
                const isIncreased = i > 0 && h.wordCount > (history[i-1].wordCount || 0);
                return (
                  <div key={i} style={{flex:1, position:'relative', height:'100%', display:'flex', alignItems:'flex-end'}}>
                     <div style={{width:'100%', background: isIncreased ? '#FFBB00' : '#DADCE0', height:`${hVal}%`, borderRadius:'4px 4px 0 0', transition:'height 1s ease', opacity: 0.6 + (i/history.length)*0.4}}></div>
                     {isIncreased && <div style={{position:'absolute', bottom:`${hVal}%`, left:'50%', transform:'translateX(-50%)', fontSize:'10px', color:'#FFBB00'}}>●</div>}
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#999', marginTop:'15px'}}><span>{"과제 시작"}</span><span style={{color:'#FFBB00', fontWeight:'bold'}}>{"현재 시점"}</span></div>
         </div>

         {/* 핵심 용어 체크리스트 */}
         <div>
            <h4 style={{fontSize:'16px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'8px'}}><Key size={18} color="#FFBB00"/> {"학습 목표 단어 성취"}</h4>
            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
              {targetKeywords.map(kw => {
                const found = selectedStudent.foundKeywords.includes(kw);
                return (
                  <div key={kw} style={{padding:'12px 15px', borderRadius:'10px', border:`1px solid ${found?'#1E8E3E':'#eee'}`, background:found?'#E6F4EA':'#fff', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'14px'}}>
                    <span style={{fontWeight:'bold', color:found?'#1E8E3E':'#999'}}>{kw}</span>
                    {found ? <CheckCircle2 color="#1E8E3E" size={18}/> : <X color="#ddd" size={18}/>}
                  </div>
                );
              })}
            </div>
         </div>
      </div>
    </div>
  );
}

function StudentView() {
  const [c, setC] = useState(''); const [n, setN] = useState('');
  return (
    <div className="card" style={{maxWidth:'450px', margin:'80px auto', textAlign:'center', padding:'50px'}}>
      <div style={{backgroundColor:'#FFBB00', width:'70px', height:'70px', borderRadius:'15px', display:'flex', justifyContent:'center', alignItems:'center', margin:'0 auto 25px'}}><Monitor color="#fff" size={36}/></div>
      <h2 style={{fontSize:'28px', marginBottom:'40px'}}>{"학생 과제 접속"}</h2>
      <input className="input" style={{textAlign:'center', fontSize:'36px', fontWeight:'bold', color:'#FFBB00', letterSpacing:'10px', height:'80px'}} placeholder="0000" value={c} onChange={e => setC(e.target.value.replace(/[^0-9]/g, '').slice(0,4))} />
      <p style={{fontSize:'13px', color:'#999', marginBottom:'30px'}}>{"선생님이 주신 숫자 4자리를 입력하세요"}</p>
      <input className="input" style={{textAlign:'center', height:'50px'}} placeholder="이름을 입력하세요" value={n} onChange={e => setN(e.target.value)} />
      <button className="main-btn" style={{width:'100%', marginTop:'30px', justifyContent:'center', fontSize:'20px', padding:'20px'}} onClick={async () => {
        try {
          const res = await axios.get(`${API_BASE}/student/access`, { params: { code: c, name: n } });
          window.open(res.data.slideUrl);
        } catch(e) { alert("코드나 이름을 다시 확인하세요."); }
      }}>{"내 슬라이드 열기 🚀"}</button>
    </div>
  );
}

export default App;