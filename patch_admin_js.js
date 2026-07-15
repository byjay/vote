const fs = require('fs');
const path = require('path');

const filePath = path.join('E:', 'code-project', 'vote', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// index.html 하단 스크립트 영역을 완벽한 바닐라 JS 어드민 앱으로 교체 (백틱 이스케이프 수정)
const scriptStartMarker = '<!-- ================= SMS Auth & App Logic ================= -->';
const newScripts = `
<!-- ================= SMS Auth & App Logic ================= -->
<script>
  window.initializeFirebase = () => {};
</script>

<script>
"use strict";

const $ = (id) => document.getElementById(id);

async function fetchJson(url, opts = {}) {
  const adminPw = localStorage.getItem("ADMIN_PW") || "";
  if (!opts.headers) opts.headers = {};
  opts.headers["x-admin-password"] = adminPw;
  
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { ok: res.ok, status: res.status, data: data || {} };
}

/* ===================== 라우팅 & 초기화 ===================== */
let CONFIG = null;
let SURVEY_ID = "1";
let VOTER_KEY = "";
let SESSION_TOKEN = "";
let SELECTED_CHOICE = null;

// 로딩 화면 숨김
function showView(viewId) {
  ["phoneAuthView", "voteView", "doneView", "loadingView", "adminApp", "voteApp"].forEach((id) => {
    if ($(id)) $(id).classList.add("hidden");
  });
  if (viewId === "adminApp") {
    $("adminApp").classList.remove("hidden");
  } else {
    $("voteApp").classList.remove("hidden");
    $(viewId).classList.remove("hidden");
  }
}

// 초기 로드
window.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  VOTER_KEY = urlParams.get("voterkey") || urlParams.get("id") || "";
  SURVEY_ID = urlParams.get("survey") || "1";

  // 관리자 비밀번호 세션이 브라우저에 남아있으면 자동으로 관리자 모드 실행
  if (localStorage.getItem("ADMIN_PW")) {
    const check = await fetchJson("/api/admin/members?survey=" + SURVEY_ID);
    if (check.ok) {
      loadAdminApp();
      return;
    }
  }

  if (!VOTER_KEY) {
    showView("phoneAuthView");
    $("globalAppError").textContent = "오류: 정상적인 투표 링크가 아닙니다. 문자 메시지의 개별 링크로 진입해 주세요.";
    $("globalAppError").classList.remove("hidden");
    $("goAdminBtn").classList.remove("hidden"); // 관리자용 기어 버튼 노출
    initAdminBtn();
    return;
  }

  // 1. 설문 설정 정보 획득
  const { ok, data } = await fetchJson("/api/config?survey=" + SURVEY_ID);
  if (!ok) {
    showView("phoneAuthView");
    $("globalAppError").textContent = "설문정보를 불러올 수 없습니다.";
    $("globalAppError").classList.remove("hidden");
    return;
  }

  CONFIG = data;
  
  // 아파트 단지명 세팅
  const aptName = CONFIG.title || "회원 안건 투표";
  $("authApartmentName").textContent = aptName;
  $("voteApartmentName").textContent = aptName;
  $("doneApartmentName").textContent = aptName;
  
  $("voteAgendaTitle").textContent = CONFIG.title || "회원 안건 투표";
  $("voteAgendaSubtitle").textContent = CONFIG.subtitle || "";
  $("doneAgendaTitle").textContent = CONFIG.title || "회원 안건 투표";

  if (CONFIG.design) {
    if (CONFIG.design.labelFor) $("optTextFor").textContent = CONFIG.design.labelFor;
    if (CONFIG.design.labelAgainst) $("optTextAgainst").textContent = CONFIG.design.labelAgainst;
  }

  showView("phoneAuthView");
  $("goAdminBtn").classList.remove("hidden"); // 투표 화면에서도 기어 노출
  initAppEvents();
  initAdminBtn();
});

// 관리자 기어 버튼 이벤트
function initAdminBtn() {
  $("goAdminBtn").addEventListener("click", async () => {
    const pw = prompt("관리자 비밀번호를 입력해 주세요.");
    if (!pw) return;

    localStorage.setItem("ADMIN_PW", pw);
    const { ok } = await fetchJson("/api/admin/members?survey=" + SURVEY_ID);
    if (ok) {
      loadAdminApp();
    } else {
      localStorage.removeItem("ADMIN_PW");
      alert("비밀번호가 일치하지 않습니다.");
    }
  });
}

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
        alert("[테스트 안내] 모의 인증번호 [" + data.mockCode + "]가 발급되었습니다. 인증번호 칸에 입력해 주세요.");
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
      
      const checkRes = await fetchJson("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY, sessionToken: SESSION_TOKEN })
      });
      
      if (checkRes.ok && checkRes.data.voted) {
        const vInfo = checkRes.data.votedInfo || {};
        const ans = vInfo.answers || {};
        const myChoice = ans.q1 || "for";
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

  // 찬반 카드 선택
  $("optCardFor").addEventListener("click", () => {
    SELECTED_CHOICE = "for";
    $("optCardFor").classList.add("selected");
    $("optCardAgainst").classList.remove("selected");
  });

  $("optCardAgainst").addEventListener("click", () => {
    SELECTED_CHOICE = "against";
    $("optCardAgainst").classList.add("selected");
    $("optCardFor").classList.remove("selected");
  });

  $("btnDetailInfo").addEventListener("click", () => {
    window.open("/manual.html", "_blank");
  });

  // 투표하기 버튼 클릭
  $("submitBtn").addEventListener("click", async () => {
    if (!SELECTED_CHOICE) {
      alert("찬성 또는 반대를 선택해 주세요.");
      return;
    }

    const answers = { q1: SELECTED_CHOICE };
    const { ok, data } = await fetchJson("/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY, sessionToken: SESSION_TOKEN, answers })
    });

    if (ok) {
      const displayChoice = SELECTED_CHOICE === "for" ? ($("optTextFor").textContent) : ($("optTextAgainst").textContent);
      $("selectedResultText").textContent = displayChoice;
      showView("doneView");
    } else {
      alert(data.error || "투표 제출 중 오류가 발생했습니다.");
    }
  });
}

/* ===================== 관리자 어플리케이션 ===================== */
let ADMIN_MEMBERS = [];

async function loadAdminApp() {
  showView("adminApp");
  
  // 탭 제어
  const tabs = document.querySelectorAll("#adminApp .tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      
      const target = tab.getAttribute("data-tab");
      ["tab-config", "tab-members", "tab-send", "tab-results"].forEach((id) => {
        $(id).classList.add("hidden");
      });
      $("tab-" + target).classList.remove("hidden");
      
      if (target === "send") renderSendList();
      if (target === "results") startPollingResults();
      else stopPollingResults();
    });
  });

  $("adminLogoutBtn").addEventListener("click", () => {
    localStorage.removeItem("ADMIN_PW");
    location.reload();
  });
  
  $("backToVoteBtn").addEventListener("click", () => {
    location.href = "/?voterkey=test&survey=" + SURVEY_ID;
  });

  await loadAdminConfig();
  await loadAdminMembers();
  initAdminConfigEvents();
  initAdminMemberEvents();
}

// 어드민 설정 로드
async function loadAdminConfig() {
  const { ok, data } = await fetchJson("/api/config?survey=" + SURVEY_ID);
  if (ok) {
    $("cfgTitle").value = data.title || "";
    $("cfgSubtitle").value = data.subtitle || "";
    if (data.design) {
      $("cfgFontSize").value = data.design.fontSize || "medium";
      $("cfgPrimaryColor").value = data.design.primaryColor || "#1e3a8a";
      $("cfgAccentColor").value = data.design.accentColor || "#b08d3f";
      $("cfgBgColor").value = data.design.bgColor || "#f4f2ec";
      $("cfgLabelFor").value = data.design.labelFor || "찬성";
      $("cfgLabelAgainst").value = data.design.labelAgainst || "반대";
      $("cfgDoneMessage").value = data.design.doneMessage || "";
    }
    
    // 링크 표시
    const voteLink = window.location.origin + "/?survey=" + SURVEY_ID;
    $("surveyShareUrl").value = voteLink;
    
    // Live Preview 연동
    updatePreview(data);
  }
}

// 실시간 미리보기 렌더링
function updatePreview(cfg) {
  $("pvTitle").textContent = cfg.title || "회원 안건 투표";
  $("pvSubtitle").textContent = cfg.subtitle || "";
  
  const d = cfg.design || {};
  $("pvBody").style.setProperty("--pv-primary", d.primaryColor || "#1e3a8a");
  $("pvBody").style.setProperty("--pv-accent", d.accentColor || "#b08d3f");
  $("pvBody").style.setProperty("--pv-bg", d.bgColor || "#f4f2ec");
}

function initAdminConfigEvents() {
  $("saveConfigBtn").addEventListener("click", async () => {
    const configData = {
      surveyId: SURVEY_ID,
      title: $("cfgTitle").value.trim(),
      subtitle: $("cfgSubtitle").value.trim(),
      questions: [
        { id: "q1", text: $("cfgTitle").value.trim() || "안건 찬반 투표", type: "boolean", options: [], parentId: null, showWhen: "any" }
      ],
      design: {
        fontSize: $("cfgFontSize").value,
        primaryColor: $("cfgPrimaryColor").value,
        accentColor: $("cfgAccentColor").value,
        bgColor: $("cfgBgColor").value,
        labelFor: $("cfgLabelFor").value.trim() || "찬성",
        labelAgainst: $("cfgLabelAgainst").value.trim() || "반대",
        doneMessage: $("cfgDoneMessage").value.trim()
      }
    };

    const { ok, data } = await fetchJson("/api/admin/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(configData)
    });

    if (ok) {
      alert("설정이 저장되었습니다.");
      updatePreview(configData);
    } else {
      alert(data.error || "설정 저장 실패");
    }
  });

  $("copySurveyUrlBtn").addEventListener("click", () => {
    $("surveyShareUrl").select();
    document.execCommand("copy");
    alert("투표 링크가 클립보드에 복사되었습니다.");
  });
}

// 대상자 로드
async function loadAdminMembers() {
  const { ok, data } = await fetchJson("/api/admin/members?survey=" + SURVEY_ID);
  if (ok) {
    ADMIN_MEMBERS = data.members || [];
    renderMembersTable();
  }
}

function renderMembersTable() {
  $("memberCount").textContent = ADMIN_MEMBERS.length + "명";
  const tbody = $("memberTable").querySelector("tbody");
  tbody.innerHTML = "";

  ADMIN_MEMBERS.forEach((m) => {
    const tr = document.createElement("tr");
    
    const tdName = document.createElement("td");
    tdName.textContent = m.name;
    tdName.style.fontWeight = "700";
    
    const tdEmail = document.createElement("td");
    tdEmail.textContent = m.email || "-";
    
    const tdPhone = document.createElement("td");
    tdPhone.textContent = m.phone || "-";
    
    const tdVoted = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = m.voted ? "badge done" : "badge pending";
    badge.textContent = m.voted ? "완료" : "대기";
    tdVoted.appendChild(badge);

    const tdAction = document.createElement("td");
    tdAction.style.textAlign = "right";
    const delBtn = document.createElement("button");
    delBtn.className = "btn-danger btn-sm";
    delBtn.textContent = "삭제";
    delBtn.addEventListener("click", async () => {
      if (!confirm("정말 이 참여자를 삭제하시겠습니까?")) return;
      const updatedList = ADMIN_MEMBERS.filter((x) => x.id !== m.id);
      const { ok } = await fetchJson("/api/admin/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "replace", surveyId: SURVEY_ID, members: updatedList })
      });
      if (ok) {
        await loadAdminMembers();
      }
    });
    tdAction.appendChild(delBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdEmail);
    tr.appendChild(tdPhone);
    tr.appendChild(tdVoted);
    tr.appendChild(tdAction);
    
    tbody.appendChild(tr);
  });
}

function initAdminMemberEvents() {
  // 회원 등록
  $("createMembersBtn").addEventListener("click", async () => {
    const lines = $("namesInput").value.trim().split("\n").filter(Boolean);
    const parsed = lines.map((l) => {
      const parts = l.trim().split(/\s+/);
      return {
        name: parts[0] || "",
        email: parts[1] || "",
        phone: parts[2] || ""
      };
    }).filter(x => x.name);

    if (parsed.length === 0) {
      alert("명단을 형식에 맞게 입력해 주세요.");
      return;
    }

    const { ok, data } = await fetchJson("/api/admin/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", surveyId: SURVEY_ID, members: parsed })
    });

    if (ok) {
      $("namesInput").value = "";
      await loadAdminMembers();
      alert("대상자가 성공적으로 등록되었습니다.");
    } else {
      alert(data.error || "등록 실패");
    }
  });

  // 전체 삭제
  $("clearMembersBtn").addEventListener("click", async () => {
    if (!confirm("정말 전체 대상자 및 투표 기록을 초기화하시겠습니까?")) return;
    const { ok } = await fetchJson("/api/admin/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear", surveyId: SURVEY_ID })
    });
    if (ok) {
      await loadAdminMembers();
    }
  });
}

// 발송 템플릿 렌더링
function renderSendList() {
  const wrap = $("mergeList");
  wrap.innerHTML = "";
  $("mergeCount").textContent = "총 대상자: " + ADMIN_MEMBERS.length + "명";

  ADMIN_MEMBERS.forEach((m) => {
    const link = window.location.origin + "/?voterkey=" + m.id + "&survey=" + SURVEY_ID;
    
    const card = document.createElement("div");
    card.className = m.voted ? "merge-card voted" : "merge-card";
    
    const body = document.createElement("div");
    body.className = "merge-card-body";
    
    const nameSpan = document.createElement("div");
    nameSpan.className = "merge-card-name";
    nameSpan.textContent = m.name;
    if (m.voted) {
      const badge = document.createElement("span");
      badge.className = "badge done";
      badge.textContent = "투표완료";
      nameSpan.appendChild(badge);
    }
    
    const tmpl = $("msgTemplate").value;
    const msg = tmpl
      .replace(/{name}/g, m.name)
      .replace(/{email}/g, m.email || "")
      .replace(/{phone}/g, m.phone || "")
      .replace(/{link}/g, link);

    const msgBox = document.createElement("div");
    msgBox.className = "merge-card-msg";
    msgBox.textContent = msg;

    body.appendChild(nameSpan);
    body.appendChild(msgBox);

    const actions = document.createElement("div");
    actions.className = "merge-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn-gold btn-sm";
    copyBtn.textContent = "복사";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(msg);
      alert(m.name + "님의 메시지가 복사되었습니다.");
    });
    actions.appendChild(copyBtn);

    card.appendChild(body);
    card.appendChild(actions);
    wrap.appendChild(card);
  });
}

// 결과 폴링
let resultsInterval = null;

function startPollingResults() {
  fetchResults();
  if (resultsInterval) clearInterval(resultsInterval);
  resultsInterval = setInterval(fetchResults, 10000);
}

function stopPollingResults() {
  if (resultsInterval) {
    clearInterval(resultsInterval);
    resultsInterval = null;
  }
}

async function fetchResults() {
  const { ok, data } = await fetchJson("/api/admin/results?survey=" + SURVEY_ID);
  if (ok) {
    const votedCount = data.votedCount || 0;
    const totalCount = data.totalCount || 0;
    $("turnoutNum").textContent = votedCount + " / " + totalCount + "명";

    const wrap = $("resultsWrap");
    wrap.innerHTML = "";

    const qResults = data.questions || [];
    qResults.forEach((q) => {
      const row = document.createElement("div");
      row.className = "bar-row";
      
      const label = document.createElement("div");
      label.className = "bar-label";
      label.textContent = q.text;
      
      const track = document.createElement("div");
      track.className = "bar-track";
      
      const forPercent = q.forPercent || 0;
      const againstPercent = q.againstPercent || 0;

      const forBar = document.createElement("div");
      forBar.className = "bar-for";
      forBar.style.width = forPercent + "%";
      forBar.textContent = forPercent > 10 ? "찬성 " + forPercent + "% (" + q.for + "표)" : "";
      
      const againstBar = document.createElement("div");
      againstBar.className = "bar-against";
      againstBar.style.width = againstPercent + "%";
      againstBar.textContent = againstPercent > 10 ? "반대 " + againstPercent + "% (" + q.against + "표)" : "";

      track.appendChild(forBar);
      track.appendChild(againstBar);
      
      row.appendChild(label);
      row.appendChild(track);
      wrap.appendChild(row);
    });

    const records = data.voterRecords || [];
    const tbody = $("voterRecordBody");
    tbody.innerHTML = "";
    if (records.length === 0) {
      $("voterRecordEmpty").style.display = "block";
    } else {
      $("voterRecordEmpty").style.display = "none";
      records.forEach((r) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--a-line)";
        
        const tdName = document.createElement("td");
        tdName.textContent = r.name;
        tdName.style.padding = "8px 10px";
        
        const tdEmail = document.createElement("td");
        tdEmail.textContent = r.email || "-";
        tdEmail.style.padding = "8px 10px";
        
        const tdTime = document.createElement("td");
        tdTime.textContent = new Date(r.timestamp).toLocaleString();
        tdTime.style.padding = "8px 10px";
        tdTime.style.color = "var(--a-ink-soft)";

        tr.appendChild(tdName);
        tr.appendChild(tdEmail);
        tr.appendChild(tdTime);
        tbody.appendChild(tr);
      });
    }
  }
}
</script>
`;

const scriptIdx = content.indexOf(scriptStartMarker);
if (scriptIdx >= 0) {
  content = content.substring(0, scriptIdx) + newScripts;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("어드민 JS 로직 패치 성공!");