const fs = require('fs');
const path = require('path');

const filePath = path.join('E:', 'code-project', 'vote', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1단계: initAppEvents 내의 로컬 함수 블록들을 전역으로 추출하기 위해 index.html에서 해당 스크립트 부분을 정교하게 리팩터링
// isQuestionVisible, renderQuestions, renderVotedSummary 를 initAppEvents 위로 올림

const oldInitAppEvents = `function initAppEvents() {
  // 인증번호 전송 (문자/카카오톡 채널 선택 지원)
  $("btnSendSms").addEventListener("click", async () => {
    const phone = $("inputPhoneNum").value.trim();
    if (!phone) {
      alert("핸드폰 번호를 입력해 주세요.");
      return;
    }

    const channelInput = document.querySelector('input[name="authChannel"]:checked');
    const channel = channelInput ? channelInput.value : "sms";
    
    $("globalAppError").classList.add("hidden");
    const { ok, data } = await fetchJson("/api/send-sms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY, phone, channel })
    });
    
    if (ok) {
      $("smsCodeFieldWrap").classList.remove("hidden");
      if (data.mockCode) {
        alert("[테스트 안내] 모의 " + data.channelName + " 인증번호 [" + data.mockCode + "]가 발급되었습니다. 인증번호 칸에 입력해 주세요.");
      } else {
        alert(data.channelName + "으로 인증번호가 발송되었습니다.");
      }
    } else {
      alert(data.error || "인증번호 발송 실패");
    }
  });

  // 플레이스토어 심사용 개인인증 정보 완전 파기 (잊힐 권리 동의철회 연동)
  if ($("btnDeleteMyData")) {
    $("btnDeleteMyData").addEventListener("click", async () => {
    if (!confirm("정말 본인의 핸드폰 인증 정보 및 투표 이력을 서버에서 완전히 삭제하시겠습니까?\\n삭제 시 본인 인증 정보가 영구 파기됩니다.")) return;
    const { ok, data } = await fetchJson("/api/delete-my-data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY })
    });
      if (ok) {
        alert("개인 정보 및 인증 데이터가 영구적으로 완전 파기되었습니다.");
        location.reload();
      } else {
        alert(data.error || "데이터 삭제 중 오류가 발생했습니다.");
      }
    });
  }

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
        renderVotedSummary(ans);
        showView("doneView");
      } else {
        showView("voteView");
        ANSWERS = {};
        renderQuestions();
      }
    } else {
      alert(data.error || "인증번호 확인 실패");
    }
  });

  // 동적 문항 응답 데이터 저장소 (글로벌 ANSWERS 사용)

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
  }
}`;

const newInitAppEvents = `// 가시성 판단 헬퍼 (백엔드 _utils.js의 isQuestionVisible과 100% 싱크 - 글로벌 스코프 배치)
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

// 동적 설문 렌더링 핵심 엔진 (글로벌 스코프 배치)
function renderQuestions() {
  const wrap = $("questionsWrap");
  if (!wrap) return;
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
  if ($("progressText")) $("progressText").textContent = answeredCount + " / " + visibleQuestions.length;
  const percent = visibleQuestions.length > 0 ? (answeredCount / visibleQuestions.length) * 100 : 0;
  if ($("progressFill")) $("progressFill").style.width = percent + "%";
}

// 투표 완료 후 나의 응답 요약 출력기 (글로벌 스코프 배치)
function renderVotedSummary(answers) {
  const list = $("voterVotedAnswersList");
  if (!list) return;
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
}

function initAppEvents() {
  // 인증번호 전송 (문자/카카오톡 채널 선택 지원)
  $("btnSendSms").addEventListener("click", async () => {
    const phone = $("inputPhoneNum").value.trim();
    if (!phone) {
      alert("핸드폰 번호를 입력해 주세요.");
      return;
    }

    const channelInput = document.querySelector('input[name="authChannel"]:checked');
    const channel = channelInput ? channelInput.value : "sms";
    
    $("globalAppError").classList.add("hidden");
    const { ok, data } = await fetchJson("/api/send-sms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY, phone, channel })
    });
    
    if (ok) {
      $("smsCodeFieldWrap").classList.remove("hidden");
      if (data.mockCode) {
        alert("[테스트 안내] 모의 " + data.channelName + " 인증번호 [" + data.mockCode + "]가 발급되었습니다. 인증번호 칸에 입력해 주세요.");
      } else {
        alert(data.channelName + "으로 인증번호가 발송되었습니다.");
      }
    } else {
      alert(data.error || "인증번호 발송 실패");
    }
  });

  // 플레이스토어 심사용 개인인증 정보 완전 파기 (잊힐 권리 동의철회 연동)
  if ($("btnDeleteMyData")) {
    $("btnDeleteMyData").addEventListener("click", async () => {
      if (!confirm("정말 본인의 핸드폰 인증 정보 및 투표 이력을 서버에서 완전히 삭제하시겠습니까?\\n삭제 시 본인 인증 정보가 영구 파기됩니다.")) return;
      const { ok, data } = await fetchJson("/api/delete-my-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ surveyId: SURVEY_ID, voterkey: VOTER_KEY })
      });
      if (ok) {
        alert("개인 정보 및 인증 데이터가 영구적으로 완전 파기되었습니다.");
        location.reload();
      } else {
        alert(data.error || "데이터 삭제 중 오류가 발생했습니다.");
      }
    });
  }

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
        renderVotedSummary(ans);
        showView("doneView");
      } else {
        showView("voteView");
        ANSWERS = {};
        renderQuestions();
      }
    } else {
      alert(data.error || "인증번호 확인 실패");
    }
  });

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
}`;

content = content.replace(oldInitAppEvents, newInitAppEvents);

fs.writeFileSync(filePath, content, 'utf8');
console.log("글로벌 헬퍼 함수 스코프 교정 리팩터링 완료!");