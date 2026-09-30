## 세종대학교 디자이노베이션전공 졸업전시회 아카이브 워드프레스
http://sj-di.com/wp-admin/

## message-api
http://sj-di.com/wp-json/sejong/v1/messages


워드프레스 플러그인에 Sejong Message API를 추가하는 형태로 진행하였다.


### 테이블 형태
댓글 번호:  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
유저 이름:  nickname   VARCHAR(20)     NOT NULL
댓글 내용:  message    VARCHAR(300)    NOT NULL
작성 시간:  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP

### 메시지 삭제하는법
워드프레스 -> Database -> Run SQL Query

DELETE FROM wp_sejong_messages WHERE id = 1;
입력 시 id 1번의 댓글이 삭제된다. (id = 3 이런식으로 숫자만 바꾸면 됩니다.)

무슨 댓글을 삭제하고 싶은지 확인하고 싶다면 위 message-api 링크를 클릭한 후
pretty print 적용 체크박스를 클릭하면 된다.