(() => {
  const form = document.querySelector('#message-form');
  const board = document.querySelector('#message-board');
  const status = document.querySelector('#message-status');
  const apiConfig = window.MESSAGE_API_CONFIG || {};
  const apiEndpoint = apiConfig.endpoint;
  const initialMessages = [];

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

  const normalizeMessages = messages => {
    if (!Array.isArray(messages)) return [];
    return messages
      .map(({ nickname, name, message }) => ({
        name: nickname || name || '',
        message: message || '',
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

  const renderMessages = async () => {
    const messages = await readMessages();
    board.replaceChildren(...[...messages, ...initialMessages].map(createCard));
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get('nickname').trim();
    const message = data.get('encouragement').trim();
    if (!name || !message) return;

    try {
      await saveMessage({ name, message });
      await renderMessages();
      form.reset();
      status.textContent = '응원 메시지가 등록되었습니다.';
    } catch (error) {
      status.textContent = `메시지를 저장하지 못했습니다. ${error.message}`;
    }
  });

  renderMessages().catch(() => {
    status.textContent = '메시지를 불러오지 못했습니다.';
    board.replaceChildren(...initialMessages.map(createCard));
  });
})();
