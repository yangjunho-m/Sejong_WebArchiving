(() => {
  const form = document.querySelector('#message-form');
  const board = document.querySelector('#message-board');
  const status = document.querySelector('#message-status');
  const storageKey = 'button-up-guestbook-messages';
  const initialMessages = [
    { name: '홍길동', message: '졸전 준비하느라 고생 많았어~\n졸업 너무너무 축하해~' },
    { name: '동문 일동', message: '후배님들 수고 많으셨습니다.\n찬란한 미래를 응원합니다.' },
    { name: '홍길동', message: '현정이!!! 졸전 짱!!! 정말 준비한다고 수고 많았어ㅠㅠ 네 손길 닿은 곳 하나하나 정말 세심하고 퀄리티 좋아서 너무 부럽다 전시 마지막까지 힘내고 멋진 대학생활 잘 마무리 해!! 수고 많았어!!!' },
    { name: '일란머스', message: '안녕하세요? 일란머스글입니다.\n세종대학교 졸업전시를 축하합니다.\n저희와 함께 일하시죠.' },
    { name: '홍길동', message: '옆에서 졸전 준비하는 모습 잘 지켜볼 수 있어서 너무 좋았고 그만큼 고생한 거 너무 잘 알아서 결과물 보니까 더 대견하고 멋지고 자랑스럽다!!! 공들이 자랑 하원이 졸업 축하하고 앞으로 계속 함께하자 사랑해 ^^' }
  ];

  const readMessages = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  const createCard = ({ name, message }) => {
    const card = document.createElement('article');
    card.className = 'message-card';
    const text = document.createElement('p');
    text.className = 'message-card-message';
    text.textContent = message;
    const author = document.createElement('p');
    author.className = 'message-card-name';
    author.textContent = name;
    card.append(text, author);
    return card;
  };

  const renderMessages = () => {
    board.replaceChildren(...[...readMessages(), ...initialMessages].map(createCard));
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get('nickname').trim();
    const message = data.get('encouragement').trim();
    if (!name || !message) return;

    const messages = readMessages();
    messages.unshift({ name, message });
    localStorage.setItem(storageKey, JSON.stringify(messages));
    renderMessages();
    form.reset();
    status.textContent = '응원 메시지가 등록되었습니다.';
  });

  renderMessages();
})();
