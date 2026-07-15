const fs = require('fs');
const path = require('path');

const filePath = path.join('E:', 'code-project', 'vote', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. CSS 스타일 보강 (Style 태그 뒷부분에 모바일 투표 전용 CSS 주입)
const customCss = `
  /* 모바일 투표 전용 추가 디자인 */
  .mobile-header-logo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 2px solid #00a896;
    margin-bottom: 20px;
  }
  .mobile-header-logo .logo-title {
    font-size: 1.3em;
    font-weight: 800;
    color: #00a896;
    font-family: sans-serif;
  }
  .mobile-header-logo .logo-badge {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #00a896;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 14px;
  }
  .input-label-info {
    font-size: 0.85em;
    color: #555;
    margin-bottom: 8px;
    text-align: left;
  }
  .sms-notice-text {
    font-size: 0.85em;
    color: #4a90e2;
    margin: 12px 0;
    text-align: left;
    font-weight: 600;
  }
  .apartment-footer-name {
    margin-top: 30px;
    font-size: 0.9em;
    font-weight: 700;
    color: #333;
    text-align: center;
    letter-spacing: 0.5px;
  }
  .detail-info-btn {
    background: #fff;
    color: #0070f3;
    border: 1px solid #0070f3;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.88em;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 20px;
    display: inline-block;
  }
  .option-card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 25px;
    text-align: left;
  }
  .option-card {
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .option-card:hover {
    border-color: #0070f3;
  }
  .option-card.selected {
    border-color: #0070f3;
    background: rgba(0, 112, 243, 0.03);
  }
  .option-card .check-circle {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid #ccc;
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: transparent;
    font-weight: 700;
  }
  .option-card.selected .check-circle {
    border-color: #0070f3;
    background: #0070f3;
    color: #fff;
  }
  .option-card .option-text {
    font-size: 1.1em;
    font-weight: 700;
    color: #333;
  }
  .submit-vote-btn {
    width: 100%;
    background: #0056b3;
    color: #fff;
    border: none;
    padding: 14px;
    border-radius: 8px;
    font-size: 1.1em;
    font-weight: 700;
    cursor: pointer;
  }
  .submit-vote-btn:hover {
    background: #004085;
  }
  .yellow-success-bar {
    background: #fff9db;
    border: 1px solid #ffe066;
    color: #f59f00;
    padding: 12px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.95em;
    margin: 20px 0;
    text-align: center;
  }
  .completed-mark-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 4px solid #40c057;
    color: #40c057;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 15px;
    font-size: 32px;
    font-weight: 800;
  }
`;

content = content.replace('</style>', customCss + '\n</style>');

// 2. HTML 투표 영역 전면 개편
const newHtml = `
<!-- ================= 투표 화면 ================= -->
<button id="goAdminBtn" class="admin-fab hidden" type="button" title="관리자 설정">
  <span class="iconify" data-icon="solar:settings-bold"></span>
</button>

<div id="voteApp">
  <div class="card" style="box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 12px; max-width: 480px; margin: 0 auto;">
    <div class="card-inner" style="padding: 24px;">
      
      <!-- 공통 로고 헤더 -->
      <div class="mobile-header-logo">
        <span class="logo-title">투표</span>
        <div class="logo-badge">🏢</div>
      </div>

      <!-- 에러 표시용 -->
      <div class="error hidden" id="globalAppError" style="color:#d9534f; font-weight:700; margin-bottom:15px; text-align:left;"></div>

      <!-- 2단계: 핸드폰 인증 뷰 -->
      <div id="phoneAuthView" class="hidden">
        <h2 style="font-size: 1.3em; font-weight: 800; margin-bottom: 20px; text-align: left; color:#333;">핸드폰인증</h2>
        
        <div class="field" style="margin-bottom: 16px; text-align: left;">
          <div class="input-label-info">핸드폰번호</div>
          <input type="tel" id="inputPhoneNum" class="input-field" placeholder="01012345678" style="padding: 12px; border-radius: 6px; border: 1px solid #ccc; width: 100%; box-sizing: border-box;" />
        </div>
        
        <button id="btnSendSms" class="primary" type="button" style="width:100%; padding:12px; border-radius:6px; font-weight:700; margin-bottom: 20px; background:#0070f3; border-color:#0070f3;">인증번호전송</button>
        
        <div id="smsCodeFieldWrap" class="hidden" style="text-align: left;">
          <div class="sms-notice-text">핸드폰으로 전송된 인증번호를 입력하십시오</div>
          <div class="field" style="margin-bottom: 20px;">
            <input type="text" id="inputSmsCode" class="input-field" placeholder="인증번호" style="padding: 12px; border-radius: 6px; border: 1px solid #ccc; width: 100%; box-sizing: border-box;" />
          </div>
          <button id="btnVerifySms" class="primary" type="button" style="width:100%; padding:12px; border-radius:6px; font-weight:700; background:#40c057; border-color:#40c057;">확인</button>
        </div>
        
        <div class="apartment-footer-name" id="authApartmentName">-</div>
      </div>

      <!-- 3단계: 안건 투표 뷰 -->
      <div id="voteView" class="hidden">
        <h2 id="voteAgendaTitle" style="font-size: 1.25em; font-weight: 800; margin-bottom: 8px; text-align: left; color:#111; line-height: 1.4;">-</h2>
        <p id="voteAgendaSubtitle" style="font-size: 0.95em; color: #666; text-align: left; margin-bottom: 15px; line-height: 1.5; word-break: keep-all;"></p>
        
        <div style="text-align: left;">
          <button class="detail-info-btn" id="btnDetailInfo" type="button">상세정보</button>
        </div>

        <div style="font-size: 0.9em; font-weight: 700; color: #555; text-align: left; margin-bottom: 12px;">항목을 선택하십시오</div>
        
        <div class="option-card-list">
          <div class="option-card" id="optCardFor">
            <span class="check-circle">✓</span>
            <span class="option-text" id="optTextFor">찬성</span>
          </div>
          <div class="option-card" id="optCardAgainst">
            <span class="check-circle">✓</span>
            <span class="option-text" id="optTextAgainst">반대</span>
          </div>
        </div>
        
        <button class="submit-vote-btn" id="submitBtn" type="button">투표하기</button>
        
        <div class="apartment-footer-name" id="voteApartmentName">-</div>
      </div>

      <!-- 4단계: 완료 뷰 -->
      <div id="doneView" class="hidden">
        <h2 id="doneAgendaTitle" style="font-size: 1.25em; font-weight: 800; margin-bottom: 25px; text-align: left; color:#111; line-height: 1.4;">-</h2>
        
        <div class="completed-mark-circle">✓</div>
        <div style="font-size: 1.2em; font-weight: 800; color: #2b8a3e; margin-bottom: 15px;" id="selectedResultText">찬성</div>
        
        <div class="yellow-success-bar">정상적으로 투표 되었습니다.</div>
        
        <div class="apartment-footer-name" id="doneApartmentName">-</div>
      </div>

      <div id="loadingView" class="loading">불러오는 중...</div>
    </div>
  </div>
</div>
`;

// HTML 치환
const htmlStartMarker = '<!-- ================= 투표 화면 ================= -->';
const htmlEndMarker = '<!-- ================= 관리자 화면 ================= -->';
const startIdx = content.indexOf(htmlStartMarker);
const endIdx = content.indexOf(htmlEndMarker);
if (startIdx >= 0 && endIdx >= 0) {
  content = content.substring(0, startIdx) + newHtml + content.substring(endIdx);
}

// 3. 자바스크립트 로직 완전 개편 (Firebase 제거 및 SMS 바인딩)
const scriptStartMarker = '<!-- ================= Firebase SDK & App Logic ================= -->';
const newScripts = `
<!-- ================= SMS Auth & App Logic ================= -->
<script>
  window.initializeFirebase = () => {};
</script>

<script>
"use strict";

const $ = (id) => document.getElementById(id);

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { ok: res.ok, data: data || {} };
}

/* ===================== 라우팅 & 초기화 ===================== */
let CONFIG = null;
let SURVEY_ID = "1";
let VOTER_KEY = "";
let SESSION_TOKEN = "";
let VOTED = false;

// 로딩 화면 숨김
function showView(viewId) {
  ["phoneAuthView", "voteView", "doneView", "loadingView"].forEach((id) => {
    $(id).classList.add("hidden");
  });
  $(viewId).classList.remove("hidden");
}

// 초기화
window.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  VOTER_KEY = urlParams.get("voterkey") || urlParams.get("id") || "";
  SURVEY_ID = urlParams.get("survey") || "1";

  if (!VOTER_KEY) {
    showView("phoneAuthView");
    $("globalAppError").textContent = "오류: 정상적인 투표 링크가 아닙니다. 문자 메시지의 개별 링크로 진입해 주세요.";
    $("globalAppError").classList.remove("hidden");
    return;
  }

  // 1. 설문 설정 정보 획득
  const { ok, data } = await fetchJson(\`/api/config?survey=\${SURVEY_ID}\`);
  if (!ok) {
    showView("phoneAuthView");
    $("globalAppError").textContent = "설문정보를 불러올 수 없습니다.";
    $("globalAppError").classList.remove("hidden");
    return;
  }

  CONFIG = data;
  
  // 아파트명 세팅
  const aptName = CONFIG.title || "회원 안건 투표";
  $("authApartmentName").textContent = aptName;
  $("voteApartmentName").textContent = aptName;
  $("doneApartmentName").textContent = aptName;
  
  // 안건 타이틀 정보 매핑
  $("voteAgendaTitle").textContent = CONFIG.title || "회원 안건 투표";
  $("voteAgendaSubtitle").textContent = CONFIG.subtitle || "";
  $("doneAgendaTitle").textContent = CONFIG.title || "회원 안건 투표";

  if (CONFIG.design) {
    if (CONFIG.design.labelFor) $("optTextFor").textContent = CONFIG.design.labelFor;
    if (CONFIG.design.labelAgainst) $("optTextAgainst").textContent = CONFIG.design.labelAgainst;
  }

  // 바로 휴대폰 본인인증 화면 노출
  showView("phoneAuthView");
  initAppEvents();
});

let selectedChoice = null; // "for" 또는 "against"

function initAppEvents() {
  // 인증번호 전송
  $("btnSendSms").addEventListener("click", async () => {
    const phone = $("inputPhoneNum").value.trim();
    if (!phone) {
      alert("핸드폰 번호를 입력해 주세요.");
      return;
    }
    
    $("globalAppError").classList.add("hidden");
    const { ok, data } = await fetchJson("/api/send-sms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY, phone })
    });
    
    if (ok) {
      $("smsCodeFieldWrap").classList.remove("hidden");
      if (data.mockCode) {
        alert(\`[테스트 안내] 모의 인증번호 [\${data.mockCode}]가 발급되었습니다. 인증번호 칸에 입력해 주세요.\`);
      } else {
        alert("인증번호가 발송되었습니다.");
      }
    } else {
      alert(data.error || "인증번호 발송 실패");
    }
  });

  // 인증번호 확인
  $("btnVerifySms").addEventListener("click", async () => {
    const code = $("inputSmsCode").value.trim();
    if (!code) {
      alert("인증번호를 입력해 주세요.");
      return;
    }

    const { ok, data } = await fetchJson("/api/verify-sms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY, code })
    });

    if (ok) {
      SESSION_TOKEN = data.sessionToken;
      
      // 이미 투표했는지 체크하기 위해 로그인 검증 수행
      const checkRes = await fetchJson("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY, sessionToken: SESSION_TOKEN })
      });
      
      if (checkRes.ok && checkRes.data.voted) {
        const vInfo = checkRes.data.votedInfo || {};
        const ans = vInfo.answers || {};
        const myChoice = ans.q1 || "찬성";
        const displayChoice = myChoice === "for" ? ($("optTextFor").textContent) : ($("optTextAgainst").textContent);
        
        $("selectedResultText").textContent = displayChoice;
        showView("doneView");
      } else {
        showView("voteView");
      }
    } else {
      alert(data.error || "인증번호 확인 실패");
    }
  });

  // 찬성/반대 카드 클릭 이벤트
  $("optCardFor").addEventListener("click", () => {
    selectedChoice = "for";
    $("optCardFor").classList.add("selected");
    $("optCardAgainst").classList.remove("selected");
  });

  $("optCardAgainst").addEventListener("click", () => {
    selectedChoice = "against";
    $("optCardAgainst").classList.add("selected");
    $("optCardFor").classList.remove("selected");
  });

  // 상세정보 팝업 버튼
  $("btnDetailInfo").addEventListener("click", () => {
    window.open("/manual.html", "_blank");
  });

  // 투표 제출
  $("submitBtn").addEventListener("click", async () => {
    if (!selectedChoice) {
      alert("찬성 또는 반대를 선택해 주세요.");
      return;
    }

    const answers = { q1: selectedChoice };
    const { ok, data } = await fetchJson("/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY, sessionToken: SESSION_TOKEN, answers })
    });

    if (ok) {
      const displayChoice = selectedChoice === "for" ? ($("optTextFor").textContent) : ($("optTextAgainst").textContent);
      $("selectedResultText").textContent = displayChoice;
      showView("doneView");
    } else {
      alert(data.error || "투표 제출 중 오류가 발생했습니다.");
    }
  });
}
</script>
`;

const scriptIdx = content.indexOf(scriptStartMarker);
if (scriptIdx >= 0) {
  content = content.substring(0, scriptIdx) + newScripts;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("index.html 패치 성공!");