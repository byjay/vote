const fs = require('fs');
const path = require('path');

const filePath = path.join('E:', 'code-project', 'vote', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 투표 화면 HTML 마크업 개편 (하드코딩 찬반 제거, 동적 questionsWrap 복구 및 progress 바 복원)
const oldVoteViewHtml = `
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
`;

const newVoteViewHtml = `
      <!-- 3단계: 안건 투표 뷰 -->
      <div id="voteView" class="hidden">
        <h2 id="voteAgendaTitle" style="font-size: 1.25em; font-weight: 800; margin-bottom: 8px; text-align: left; color:#111; line-height: 1.4;">-</h2>
        <p id="voteAgendaSubtitle" style="font-size: 0.95em; color: #666; text-align: left; margin-bottom: 15px; line-height: 1.5; word-break: keep-all;"></p>
        
        <div style="text-align: left;">
          <button class="detail-info-btn" id="btnDetailInfo" type="button">상세정보</button>
        </div>

        <!-- 진행률 바 복원 -->
        <div class="progress" style="margin: 10px 0 20px;">
          <div class="progress-label" style="display:flex; justify-content:space-between; font-size:0.8em; color:#666; font-weight:700; margin-bottom:6px;">
            <span>응답 진행률</span>
            <b id="progressText" style="color:#0070f3;">0 / 0</b>
          </div>
          <div class="progress-track" style="height:6px; border-radius:99px; background:#e0e0e0; overflow:hidden;">
            <div class="progress-fill" id="progressFill" style="height:100%; width:0%; background:#0070f3; transition:width 0.3s ease;"></div>
          </div>
        </div>

        <!-- 동적 문항 렌더링 컨테이너 -->
        <div id="questionsWrap" style="display:flex; flex-direction:column; gap:20px; margin-bottom:25px;"></div>
        
        <button class="submit-vote-btn" id="submitBtn" type="button">투표하기</button>
        
        <div class="apartment-footer-name" id="voteApartmentName">-</div>
      </div>
`;

// doneView 완료화면 개편 (내가 투표한 내역 리스트 표시용 박스 복원)
const oldDoneViewHtml = `
      <!-- 4단계: 완료 뷰 -->
      <div id="doneView" class="hidden">
        <h2 id="doneAgendaTitle" style="font-size: 1.25em; font-weight: 800; margin-bottom: 25px; text-align: left; color:#111; line-height: 1.4;">-</h2>
        
        <div class="completed-mark-circle">✓</div>
        <div style="font-size: 1.2em; font-weight: 800; color: #2b8a3e; margin-bottom: 15px;" id="selectedResultText">찬성</div>
        
        <div class="yellow-success-bar">정상적으로 투표 되었습니다.</div>
        
        <div class="apartment-footer-name" id="doneApartmentName">-</div>
      </div>
`;

const newDoneViewHtml = `
      <!-- 4단계: 완료 뷰 -->
      <div id="doneView" class="hidden">
        <h2 id="doneAgendaTitle" style="font-size: 1.25em; font-weight: 800; margin-bottom: 20px; text-align: left; color:#111; line-height: 1.4;">-</h2>
        
        <div class="completed-mark-circle">✓</div>
        <div style="font-size: 1.15em; font-weight: 800; color: #2b8a3e; margin-bottom: 15px;">투표 완료</div>
        
        <div class="yellow-success-bar" style="margin-bottom:20px;">정상적으로 투표 되었습니다.</div>
        
        <!-- 나의 투표 이력 상세 내역 표시용 박스 복원 -->
        <div id="voterAlreadyVotedInfoBox" style="margin-top:20px; padding:16px; border:1px dashed #ccc; border-radius:12px; background:#fafafa; text-align:left; font-size:0.88em;">
          <div style="font-weight:800; color:#0056b3; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:6px;">📋 나의 선택 내역</div>
          <div id="voterVotedAnswersList" style="display:flex; flex-direction:column; gap:8px;"></div>
        </div>
        
        <div class="apartment-footer-name" id="doneApartmentName">-</div>
      </div>
`;

content = content.replace(oldVoteViewHtml, newVoteViewHtml);
content = content.replace(oldDoneViewHtml, newDoneViewHtml);

// 2. 자바스크립트 로직 교체: 동적 설문 렌더링, 조건부 렌더링, 진행 바 상태 갱신 이식
const oldJsBlock = `// 찬반 카드 선택
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
  });`;

const newJsBlock = `// 동적 문항 응답 데이터 저장소
  let ANSWERS = {};

  // 가시성 판단 헬퍼 (백엔드 _utils.js의 isQuestionVisible과 100% 싱크)
  function isQuestionVisible(q, byId, answers) {
    if (!q.parentId) return true;
    const parent = byId.get(q.parentId);
    if (!parent) return false;
    const a = answers[parent.id];
    if (parent.type === "choice") {
      if (!a) return false;
      return q.showWhen === "any" || a === q.showWhen;
    }
    if (a !== "for" && a !== "against") return false;
    return q.showWhen === "any" || a === q.showWhen;
  }

  // 동적 설문 렌더링 핵심 엔진
  function renderQuestions() {
    const wrap = $("questionsWrap");
    wrap.innerHTML = "";
    
    const byId = new Map(CONFIG.questions.map((q) => [q.id, q]));
    
    // 현재 답변 상태 기준으로 노출될 문항 필터링
    const visibleQuestions = CONFIG.questions.filter((q) => isQuestionVisible(q, byId, ANSWERS));
    
    // 비노출 문항의 기존 응답은 데이터 누출 방지를 위해 초기화
    CONFIG.questions.forEach((q) => {
      if (!visibleQuestions.includes(q)) {
        delete ANSWERS[q.id];
      }
    });

    visibleQuestions.forEach((q, idx) => {
      const qBox = document.createElement("div");
      qBox.style.padding = "16px";
      qBox.style.border = "1px solid #eee";
      qBox.style.borderRadius = "10px";
      qBox.style.background = "#fff";
      qBox.style.textAlign = "left";

      // 안건 번호 태그
      const tag = document.createElement("div");
      tag.style.fontSize = "0.75em";
      tag.style.fontWeight = "800";
      tag.style.color = CONFIG.design.accentColor || "#b08d3f";
      tag.style.marginBottom = "6px";
      tag.textContent = "안건 " + (idx + 1);
      qBox.appendChild(tag);

      // 질문 텍스트
      const p = document.createElement("p");
      p.style.fontWeight = "700";
      p.style.margin = "0 0 12px 0";
      p.style.fontSize = "1em";
      p.style.color = "#111";
      p.textContent = q.text;
      qBox.appendChild(p);

      // 선택지 카드 래퍼
      const choicesWrap = document.createElement("div");
      choicesWrap.style.display = "flex";
      choicesWrap.style.flexDirection = "column";
      choicesWrap.style.gap = "8px";

      if (q.type === "choice") {
        // 객관식 문항
        q.options.forEach((opt) => {
          const optCard = document.createElement("div");
          optCard.className = "option-card";
          optCard.style.padding = "12px 14px";
          optCard.style.border = "2.5px solid #eee";
          if (ANSWERS[q.id] === opt) {
            optCard.classList.add("selected");
            optCard.style.borderColor = CONFIG.design.primaryColor || "#0070f3";
          }
          
          const chk = document.createElement("span");
          chk.className = "check-circle";
          chk.textContent = "✓";
          if (ANSWERS[q.id] === opt) {
            chk.style.borderColor = CONFIG.design.primaryColor || "#0070f3";
            chk.style.background = CONFIG.design.primaryColor || "#0070f3";
            chk.style.color = "#fff";
          }
          
          const txt = document.createElement("span");
          txt.className = "option-text";
          txt.style.fontSize = "0.95em";
          txt.textContent = opt;
          
          optCard.appendChild(chk);
          optCard.appendChild(txt);
          
          optCard.addEventListener("click", () => {
            ANSWERS[q.id] = opt;
            renderQuestions(); // 하위 질문 토글을 위해 즉시 재렌더링
          });
          
          choicesWrap.appendChild(optCard);
        });
      } else {
        // 찬반 (boolean) 문항
        const labels = [
          { key: "for", text: CONFIG.design.labelFor || "찬성" },
          { key: "against", text: CONFIG.design.labelAgainst || "반대" }
        ];
        
        labels.forEach((lbl) => {
          const optCard = document.createElement("div");
          optCard.className = "option-card";
          optCard.style.padding = "12px 14px";
          optCard.style.border = "2.5px solid #eee";
          if (ANSWERS[q.id] === lbl.key) {
            optCard.classList.add("selected");
            optCard.style.borderColor = CONFIG.design.primaryColor || "#0070f3";
          }
          
          const chk = document.createElement("span");
          chk.className = "check-circle";
          chk.textContent = "✓";
          if (ANSWERS[q.id] === lbl.key) {
            chk.style.borderColor = CONFIG.design.primaryColor || "#0070f3";
            chk.style.background = CONFIG.design.primaryColor || "#0070f3";
            chk.style.color = "#fff";
          }
          
          const txt = document.createElement("span");
          txt.className = "option-text";
          txt.style.fontSize = "0.95em";
          txt.textContent = lbl.text;
          
          optCard.appendChild(chk);
          optCard.appendChild(txt);
          
          optCard.addEventListener("click", () => {
            ANSWERS[q.id] = lbl.key;
            renderQuestions();
          });
          
          choicesWrap.appendChild(optCard);
        });
      }

      qBox.appendChild(choicesWrap);
      wrap.appendChild(qBox);
    });

    // 진행 바 갱신
    const answeredCount = visibleQuestions.filter((q) => ANSWERS[q.id] !== undefined).length;
    $("progressText").textContent = answeredCount + " / " + visibleQuestions.length;
    const percent = visibleQuestions.length > 0 ? (answeredCount / visibleQuestions.length) * 100 : 0;
    $("progressFill").style.width = percent + "%";
  }

  $("btnDetailInfo").addEventListener("click", () => {
    window.open("/manual.html", "_blank");
  });

  // 투표 제출 핸들러
  $("submitBtn").addEventListener("click", async () => {
    const byId = new Map(CONFIG.questions.map((q) => [q.id, q]));
    const visibleQuestions = CONFIG.questions.filter((q) => isQuestionVisible(q, byId, ANSWERS));
    
    // 미완료 문항 유효성 검사
    const missing = visibleQuestions.find((q) => ANSWERS[q.id] === undefined);
    if (missing) {
      alert("모든 안건 문항에 체크해 주셔야 제출할 수 있습니다.");
      return;
    }

    const { ok, data } = await fetchJson("/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY, sessionToken: SESSION_TOKEN, answers: ANSWERS })
    });

    if (ok) {
      renderVotedSummary(ANSWERS);
      showView("doneView");
    } else {
      alert(data.error || "투표 제출 중 오류가 발생했습니다.");
    }
  });

  // 투표 완료 후 나의 응답 요약 출력기
  function renderVotedSummary(answers) {
    const list = $("voterVotedAnswersList");
    list.innerHTML = "";
    
    const byId = new Map(CONFIG.questions.map((q) => [q.id, q]));
    const visible = CONFIG.questions.filter((q) => isQuestionVisible(q, byId, answers));
    
    visible.forEach((q, idx) => {
      const ansVal = answers[q.id];
      let displayAns = ansVal;
      if (q.type !== "choice") {
        displayAns = ansVal === "for" ? (CONFIG.design.labelFor || "찬성") : (CONFIG.design.labelAgainst || "반대");
      }
      
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.padding = "4px 0";
      
      const qSpan = document.createElement("span");
      qSpan.style.color = "#555";
      qSpan.textContent = "안건 " + (idx + 1) + ". " + (q.text.length > 15 ? q.text.slice(0, 15) + "..." : q.text);
      
      const aSpan = document.createElement("span");
      aSpan.style.fontWeight = "700";
      aSpan.style.color = ansVal === "against" ? "#d9534f" : "#2b8a3e";
      aSpan.textContent = displayAns;
      
      row.appendChild(qSpan);
      row.appendChild(aSpan);
      list.appendChild(row);
    });
  }`;

content = content.replace(oldJsBlock, newJsBlock);

// 3. 페이지 로드 시 또는 인증 완료 시 renderQuestions() 최초 실행 트리거 추가
content = content.replace(
  `showView("voteView");`,
  `showView("voteView");\n        ANSWERS = {};\n        renderQuestions();`
);

content = content.replace(
  `const vInfo = checkRes.data.votedInfo || {};
        const ans = vInfo.answers || {};
        const myChoice = ans.q1 || "for";
        const displayChoice = myChoice === "for" ? ($("optTextFor").textContent) : ($("optTextAgainst").textContent);
        
        $("selectedResultText").textContent = displayChoice;
        showView("doneView");`,
  `const vInfo = checkRes.data.votedInfo || {};
        const ans = vInfo.answers || {};
        renderVotedSummary(ans);
        showView("doneView");`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("동적 멀티 문항 설문조사 패치 성공!");