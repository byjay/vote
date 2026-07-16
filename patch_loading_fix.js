const fs = require('fs');
const path = require('path');

const filePath = path.join('E:', 'code-project', 'vote', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 글로벌 스코프에 ANSWERS 전역 변수 이식 및 중복 제거
const oldGlobalVars = `let SESSION_TOKEN = "";
let SELECTED_CHOICE = null;`;

const newGlobalVars = `let SESSION_TOKEN = "";
let SELECTED_CHOICE = null;
let ANSWERS = {};`;

content = content.replace(oldGlobalVars, newGlobalVars);

// 2. initAppEvents 내부의 로컬 let ANSWERS = {}; 선언 제거
const oldAnswersLocal = `  // 동적 문항 응답 데이터 저장소
  let ANSWERS = {};`;

content = content.replace(oldAnswersLocal, `  // 동적 문항 응답 데이터 저장소 (글로벌 ANSWERS 사용)`);

// 3. addEventListener 바인딩 안전 가드 코드 보강 (Null pointer 방지)
content = content.replace(
  `  // 플레이스토어 심사용 개인인증 정보 완전 파기 (잊힐 권리 동의철회 연동)
  $("btnDeleteMyData").addEventListener("click", async () => {`,
  `  // 플레이스토어 심사용 개인인증 정보 완전 파기 (잊힐 권리 동의철회 연동)
  if ($("btnDeleteMyData")) {
    $("btnDeleteMyData").addEventListener("click", async () => {`
);

content = content.replace(
  `    if (ok) {
      alert("개인 정보 및 인증 데이터가 영구적으로 완전 파기되었습니다.");
      location.reload();
    } else {
      alert(data.error || "데이터 삭제 중 오류가 발생했습니다.");
    }
  });`,
  `      if (ok) {
        alert("개인 정보 및 인증 데이터가 영구적으로 완전 파기되었습니다.");
        location.reload();
      } else {
        alert(data.error || "데이터 삭제 중 오류가 발생했습니다.");
      }
    });
  }`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("로딩 오류(ANSWERS 레퍼런스 스코프 버그) 해결 패치 완료!");