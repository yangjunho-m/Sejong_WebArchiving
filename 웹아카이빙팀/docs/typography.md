# 타이포그래피 클래스 가이드

현재 적용 범위는 Web/index.html입니다. typography.css는 페이지 스타일 뒤에 로드합니다.

## 역할과 서체 분리

- 레이아웃 클래스(intro-copy, opening, member-row)는 위치·간격·너비를 담당합니다.
- type-nav: Avant Garde Gothic Pro, Demi 600, 22px / 140% / -2%.
- type-body: Pretendard, Medium 500, 18px / 150% / -3%. 소개글·운영 정보·위원회 명단에 적용합니다. 일반 영문 본문은 Pretendard를 사용하며, 위원회 영문 이름·역할에는 별도 type-committee-en을 사용합니다.
- type-title-ko: Pretendard, Bold 700, 32px / 130% / -3%.
- font-en: 영문 구간의 서체만 Avant Garde로 교체합니다. 크기·굵기·행간·자간은 역할에서 유지됩니다.
- lang="ko" / lang="en"은 콘텐츠의 언어를 표시합니다. 언어만으로 모든 요소의 서체를 일괄 변경하지 않습니다.

예: `<p class="opening-description type-body">운영 안내</p>`
예: `<h3 class="type-title-ko"><span class="font-en" lang="en">OPENNING,</span> 첫 단추 끼우기</h3>`

## 다른 페이지 확장

새로운 설정은 type-project-title, type-designer-name, type-caption처럼 의미 있는 역할로 추가합니다. 같은 값이면 기존 역할을 재사용하고, 다르면 해당 역할의 설정을 명시합니다. 페이지마다 h2나 p 전체를 덮어쓰는 방식은 피합니다. 영어 제목의 굵기까지 달라지면 font-en만으로 처리하지 말고 type-title-en 역할을 별도로 정의합니다.

현재 반복 선택자(.type-body.type-body)는 기존 CSS의 요소 선택자보다 우선하도록 하는 임시 호환 장치입니다. 기존 페이지를 순차 이전하면서 레이아웃 CSS의 글꼴 설정을 제거하면 단일 클래스 선택자로 정리할 수 있습니다. 기존 !important 규칙은 별도로 정리해야 하므로 다른 페이지에 스타일시트만 추가한다고 이전이 완료되는 것은 아닙니다.

## 단위와 반응형

피그마의 숫자 크기에 맞춰 CSS px를 사용합니다. 메뉴 22px, 본문 18px, 한글 제목 32px입니다. CSS pt는 같은 숫자의 px보다 약 1.33배 커지므로 사용하지 않습니다. 자간 -2%, -3%는 각각 -0.02em, -0.03em입니다.

모바일 축소 값은 아직 지정되지 않았으므로 동일한 타이포그래피 값을 유지합니다. 추후 필요하면 미디어 쿼리 안에서 역할별 크기 변수를 조정합니다.

## 폰트 로딩 및 범위

홈은 Pretendard 스타일시트를 HTML link로 직접 로드합니다. 기존 style.css의 늦은 @import에 의존하지 않습니다. Avant Garde Pro라는 CSS 패밀리명에는 기존 로컬 LT Demi/Medium 파일이 연결되어 있습니다. 별도의 Pro Demi 원본 파일은 현재 폰트 폴더에 없습니다.

영문 단독 제목 OPENING HOUR와 로고 이미지는 기존 설정을 유지했습니다. COMMITTEE 제목은 type-committee-title(Avant Garde Demi 600, 48px / 130% / 0), 위원회 영문 이름·역할은 type-committee-en(Avant Garde Demi 600, 18px / 140% / 0)을 사용합니다. 홈 소개 영역은 글자 확대에 맞춰 고정 높이를 최소 높이로 전환하고 위원회 명단의 줄바꿈 제한을 해제했습니다.

위원회 한글 이름·부서명·직책은 type-committee-name(Pretendard Bold 700, 20px / 140% / -2%)을 사용합니다. 역할 및 이름 아래 영문 표기는 type-committee-en 설정이 우선합니다.

홈 푸터 SNS 링크와 주소는 type-footer(Avant Garde Demi 600, 18px / 140% / 0)을 사용합니다. footer-address는 주소·이메일·전화번호를 각각 자식 요소로 두고 세로 flex 및 gap: 4px으로 배치합니다. 모바일에서도 같은 타이포그래피를 유지하며 좁은 화면에서 긴 주소는 자연스럽게 줄바꿈됩니다. 저작권 표기는 기존 설정을 유지합니다.

위원회 간격: members의 row-gap은 80px, committee-label은 한글·영문을 세로 flex로 배치하고 gap 8px을 사용합니다. committee-people은 부서 내 여러 사람을 묶으며 사람 사이 간격은 임시 28px입니다(별도 피그마 값 미지정). 모바일에서도 80px/8px을 유지하며 각 행은 콘텐츠 높이에 따라 늘어납니다.
