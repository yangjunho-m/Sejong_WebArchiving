(() => {
  const form = document.querySelector('#message-form');
  const board = document.querySelector('#message-board');
  const status = document.querySelector('#message-status');
  const apiConfig = window.MESSAGE_API_CONFIG || {};
  const apiEndpoint = apiConfig.endpoint;
  const initialMessages = [];
  const messageInput = form?.querySelector('#encouragement');

  const counter = document.querySelector('#message-count');
  const sort = document.querySelector('#message-sort');
  const more = document.querySelector('#message-more');
  let allMessages = [];
  let visibleCount = 12;
  const columns = window.matchMedia('(max-width: 900px)');
  const mobileColumns = window.matchMedia('(max-width: 700px)');
  const syncCounter = () => { counter.textContent = `${messageInput.value.length} / 300`; };
  messageInput.addEventListener('input', syncCounter);

  const createCard = ({ name, message, createdAt }) => {
    const card = document.createElement('article');
    card.className = 'message-card';
    const text = document.createElement('p');
    text.className = 'message-card-message';
    text.textContent = message;
    const author = document.createElement('p');
    author.className = 'message-card-name';
    author.textContent = name;
    const metadata = document.createElement('div');
    metadata.className = 'message-card-meta';
    metadata.append(author);
    // The API supplies its saved local date; keep it independent of viewer timezone.
    const dateParts = typeof createdAt === 'string' && createdAt.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]|$)/);
    if (dateParts) {
      const [, year, month, day] = dateParts;
      const date = document.createElement('time');
      date.className = 'message-card-date';
      date.dateTime = `${year}-${month}-${day}`;
      date.textContent = `${year}. ${month}. ${day}`;
      metadata.append(date);
    }
    card.append(text, metadata);
    return card;
  };

  const normalizeMessages = messages => {
    if (!Array.isArray(messages)) return [];
    return messages
      .map(({ nickname, name, message, created_at }) => ({
        name: nickname || name || '',
        message: message || '',
        createdAt: created_at || '',
      }))
      .filter(item => item.name && item.message);
  };

  const readMessages = async () => {
    if (!apiEndpoint) {
      status.textContent = '메시지 API 주소가 설정되지 않았습니다.';
      return [];
    }

    const response = await fetch(apiEndpoint, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Could not load messages.');
    const payload = await response.json();
    return normalizeMessages(payload.messages || payload);
  };

  const saveMessage = async ({ name, message }) => {
    if (!apiEndpoint) throw new Error('Message API endpoint is missing.');

    const body = new URLSearchParams();
    body.set('nickname', name);
    body.set('message', message);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Could not save message. (${response.status})`);
    }
  };

  const displayMessages = () => {
    const ordered = sort.value === 'oldest' ? [...allMessages].reverse() : allMessages;
    const columnCount = mobileColumns.matches ? 1 : columns.matches ? 2 : 4;
    const containers = Array.from({ length: columnCount }, () => {
      const column = document.createElement('div');
      column.className = 'message-column';
      return column;
    });
    ordered.slice(0, visibleCount).forEach((item, index) => containers[index % columnCount].append(createCard(item)));
    board.replaceChildren(...containers);
    more.hidden = visibleCount >= ordered.length;
  };
  sort.addEventListener('change', () => { visibleCount = 12; displayMessages(); });
  more.addEventListener('click', () => { visibleCount += 12; displayMessages(); });
  columns.addEventListener('change', displayMessages);
  mobileColumns.addEventListener('change', displayMessages);
  const renderMessages = async () => {
    const messages = await readMessages();
    allMessages = [...messages, ...initialMessages];
    displayMessages();
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get('nickname').trim();
    const message = data.get('encouragement').trim();
    if (!name || !message) return;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = '남기는 중…';
    try {
      await saveMessage({ name, message });
      await renderMessages();
      form.reset();
      syncCounter();
      status.textContent = '응원 메시지가 등록되었습니다.';
    } catch (error) {
      status.textContent = `메시지를 저장하지 못했습니다. ${error.message}`;
    } finally {
      button.disabled = false;
      button.textContent = '응원 남기기';
    }
  });

  renderMessages().catch(() => {
    status.textContent = '메시지를 불러오지 못했습니다.';
    board.replaceChildren(...initialMessages.map(createCard));
  });
})();
