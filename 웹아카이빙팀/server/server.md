## 세종대학교 디자이노베이션전공 졸업전시회 아카이브 워드프레스
http://sj-di.com/wp-admin/

## message-api
http://sj-di.com/wp-json/sejong/v1/messages


워드프레스 플러그인에 Sejong Message API를 추가하는 형태로 진행하였다.

### 메시지 관리자 로그인·삭제 (v1.1.0)

- `message.html`의 **푸터 로고**를 누르면 관리자 로그인 창이 열린다.
- 계정은 `sejongdi` 하나이며 비밀번호는 요청 시 지정한 값을 사용한다. 회원가입이나 워드프레스 관리자 계정 생성은 필요하지 않다.
- 일반 방문자는 기존처럼 응원 메시지를 작성·조회할 수 있다. 삭제는 로그인한 메시지 관리자만 가능하다.
- 로그인하면 각 메시지에 **삭제** 버튼이 나타난다. 확인창에서 승인하면 해당 메시지 하나가 영구 삭제된다.
- 다시 푸터 로고를 누르면 로그아웃할 수 있다. 로그인 세션은 최대 8시간 유지되며, 만료되면 다시 로그인해야 한다.
- 비밀번호는 서버 PHP 파일에 bcrypt 해시로만 저장한다. 브라우저 코드 및 localStorage에는 비밀번호나 로그인 토큰을 저장하지 않는다.
- 서버에서 세션 쿠키와 CSRF 토큰을 검증한다. 로그인은 같은 IP에서 5회 실패하면 15분 동안 제한된다.

### 운영 서버 반영 순서

로컬 파일만 수정한 상태에서는 운영 사이트가 바뀌지 않는다. 아래 서버 플러그인과 웹 파일을 **모두** 반영해야 한다.

1. 워드프레스 관리자에서 기존 데이터베이스를 백업한다.
2. **플러그인 → 새 플러그인 추가 → 플러그인 업로드**에서 이 폴더의 `sejong-message-api.zip`을 업로드하고 기존 Sejong Message API를 v1.1.0으로 교체한다. 플러그인을 활성화 상태로 둔다. 기존 메시지 테이블 구조와 저장된 메시지는 유지된다.
3. 웹 서버의 `/2026-buttonup/` 아래에 다음 세 파일을 같은 경로로 덮어쓴다.
   - `Web/html/message.html` → `/2026-buttonup/html/message.html`
   - `Web/js/message.js` → `/2026-buttonup/js/message.js`
   - `Web/css/message.css` → `/2026-buttonup/css/message.css`
4. 페이지/API에 캐시 플러그인 또는 CDN을 사용한다면 캐시를 비우고, `/wp-json/sejong/v1/messages/admin/*`는 캐시에서 제외한다.
5. 비로그인 창에서 삭제 버튼이 없는지 확인하고, 푸터 로고로 로그인한 뒤 테스트 메시지만 삭제한다. 새로고침 후에도 삭제 결과가 유지되고, 로그아웃하면 삭제 버튼이 사라지는지 확인한다.

`message-admin-update.zip`에는 위 웹 파일 3개(배포 경로 `2026-buttonup/`), 플러그인 ZIP과 이 설치 안내가 들어 있다. 플러그인 ZIP은 웹 공개 폴더에 올리지 말고 워드프레스 플러그인 업로드에서 설치한다.

**보안:** 현재 안내된 사이트는 HTTP이다. HTTP에서는 비밀번호와 로그인 쿠키가 전송 중 암호화되지 않으므로 관리자 로그인·삭제를 HTTPS에서만 허용한다. HTTP 화면에서는 로그인 입력 대신 HTTPS 이동 링크를 표시한다. 운영 관리자 로그인 전에 호스팅에서 도메인의 HTTPS 인증서를 설정하고 워드프레스의 사이트/워드프레스 주소도 HTTPS로 설정해야 한다. 로그인 쿠키는 Secure·HttpOnly·SameSite=Strict 속성을 사용한다. 웹 페이지와 워드프레스 API는 같은 도메인·프로토콜로 사용해야 한다. SSL을 프록시에서 종료하는 호스팅은 워드프레스의 `is_ssl()`이 HTTPS 요청을 인식하도록 호스팅 설정도 확인한다.

### 추가 API

- `POST /wp-json/sejong/v1/messages/admin/login`: 단일 관리자 로그인 (`username`, `password`).
- `GET /wp-json/sejong/v1/messages/admin/session`: 로그인 상태·CSRF 토큰 조회. 캐시 금지.
- `DELETE /wp-json/sejong/v1/messages/admin/session`: 로그아웃·서버 세션 폐기.
- `DELETE /wp-json/sejong/v1/messages/{id}`: 로그인한 관리자만 메시지 하나 삭제.

로그인·삭제·로그아웃 요청은 `X-Sejong-Admin: 1` 헤더가 필요하며, 삭제·로그아웃은 세션 쿠키와 `X-Sejong-CSRF` 토큰도 필요하다. 프런트엔드가 자동 처리한다.

### 로컬 검증

`scripts/test-message-admin.php`는 워드프레스 함수·DB를 테스트 대역으로 사용해 실제 PHP 인증·권한·삭제 로직을 확인한다. PHP 8 이상에서 `SEJONG_TEST_PASSWORD` 환경 변수에 관리자 비밀번호를 설정하고 실행한다.

`scripts/test-message-admin.cjs`는 Playwright와 설치된 Chrome으로 PC/모바일 화면의 로그인, 실패, 세션 복원, 삭제 취소·실패·성공, 로그아웃 및 세션 만료를 확인한다. Playwright를 찾을 수 있는 `NODE_PATH`를 설정한 뒤 `node scripts/test-message-admin.cjs`로 실행한다. 운영 데이터에는 접근하지 않는다.


### 테이블 형태
댓글 번호:  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
유저 이름:  nickname   VARCHAR(20)     NOT NULL
댓글 내용:  message    VARCHAR(300)    NOT NULL
작성 시간:  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP

### SQL로 메시지 삭제하는법 (수동 관리가 필요할 때)
워드프레스 -> Database -> Run SQL Query

DELETE FROM wp_sejong_messages WHERE id = 1;
입력 시 id 1번의 댓글이 삭제된다. (id = 3 이런식으로 숫자만 바꾸면 됩니다.)

무슨 댓글을 삭제하고 싶은지 확인하고 싶다면 위 message-api 링크를 클릭한 후
pretty print 적용 체크박스를 클릭하면 된다.
