const fs = require('fs');
const path = require('path');

const filePath = path.join('E:', 'code-project', 'vote', 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 관리자 회원 테이블의 헤더와 바인딩 부분에 "휴대폰 번호" 열 추가
const tableThSearch = '<thead><tr><th>이름</th><th>이메일 주소</th><th>참여 여부</th><th style="text-align:right;">작업</th></tr></thead>';
const tableThReplace = '<thead><tr><th>이름</th><th>이메일 주소</th><th>휴대폰 번호</th><th>참여 여부</th><th style="text-align:right;">작업</th></tr></thead>';
content = content.replace(tableThSearch, tableThReplace);

// 2. 어드민 입력 명단 안내 문구 교체 (휴대폰 번호 입력 지원 포함)
content = content.replace(
  `<label for="namesInput" style="margin:0;">투표 대상자 명단 <span class="muted">(한 줄에 '이름' 또는 '이름 이메일' 형식)</span></label>`,
  `<label for="namesInput" style="margin:0;">투표 대상자 명단 <span class="muted">(한 줄에 '이름 이메일 휴대폰번호' 형식)</span></label>`
);
content = content.replace(
  `placeholder="홍길동\n김철수 chulsoo@gmail.com"`,
  `placeholder="홍길동 user1@mail.com 01012345678\n김철수 user2@mail.com 01087654321"`
);

// 3. 발송 탭의 기본 문자 메시지 템플릿과 안내문구에서 구글 로그인 관련 문장 제거
const defaultTemplate = `[{name}]님 안녕하세요.

안건 투표를 진행해 주세요.

🔗 투표 링크: {link}
👤 대상자: {name}
✉️ 이메일: {email}
📱 연락처: {phone}

※ 본인의 휴대폰 번호 인증을 완료하여 참여해 주세요.`;

content = content.replace(
  /<textarea id="msgTemplate">[\s\S]*?<\/textarea>/,
  `<textarea id="msgTemplate">${defaultTemplate}</textarea>`
);

content = content.replace(
  `변수: <code>{name}</code> 이름 · <code>{email}</code> 이메일 · <code>{link}</code> 고유 설문 투표 링크`,
  `변수: <code>{name}</code> 이름 · <code>{email}</code> 이메일 · <code>{phone}</code> 휴대폰번호 · <code>{link}</code> 고유 설문 투표 링크`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("어드민 UI 뼈대 패치 완료");