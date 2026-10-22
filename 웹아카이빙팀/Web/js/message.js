(() => {
  const form = document.querySelector('#message-form');
  const board = document.querySelector('#message-board');
  const status = document.querySelector('#message-status');
  const boardStatus = document.querySelector('#message-board-status');
  const apiConfig = window.MESSAGE_API_CONFIG || {};
  const apiEndpoint = apiConfig.endpoint;
  const initialMessages = [];
  const messageInput = form?.querySelector('#encouragement');

  const counter = document.querySelector('#message-count');
  const sort = document.querySelector('#message-sort');
  const more = document.querySelector('#message-more');
  let allMessages = [];
  let visibleCount = 12;
  let adminCsrf = '';
  const adminDialog = document.querySelector('#message-admin-dialog');
  const adminForm = document.querySelector('#message-admin-login');
  const adminSession = document.querySelector('#message-admin-session');
  const adminStatus = document.querySelector('#message-admin-status');
  const adminHttps = document.querySelector('#message-admin-https');
  const secureAdmin = location.protocol === 'https:' && apiEndpoint && new URL(apiEndpoint, location.href).protocol === 'https:';
  const httpsUrl = new URL(location.href);
  httpsUrl.protocol = 'https:';
  adminHttps.querySelector('a').href = httpsUrl.href;
  adminHttps.hidden = secureAdmin;
  adminForm.hidden = !secureAdmin;
  const logoutButton = document.querySelector('#message-admin-logout');
  const footerLogo = document.querySelector('#footer .footer-symbol');
  const adminButton = document.createElement('button');
  adminButton.type = 'button';
  adminButton.className = footerLogo.className;
  adminButton.setAttribute('aria-label', '메시지 관리자 로그인');
  adminButton.setAttribute('aria-haspopup', 'dialog');
  adminButton.setAttribute('aria-controls', adminDialog.id);
  adminButton.append(...footerLogo.childNodes);
  footerLogo.replaceWith(adminButton);
  const columns = window.matchMedia('(max-width: 900px)');
  const mobileColumns = window.matchMedia('(max-width: 700px)');
  const resizeMessageInput = () => {
    const styles = getComputedStyle(messageInput);
    const minimum = parseFloat(styles.minHeight);
    const maximum = parseFloat(styles.maxHeight);
    messageInput.style.height = '0px';
    const contentHeight = messageInput.scrollHeight + parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    messageInput.style.height = `${Math.min(maximum, Math.max(minimum, contentHeight))}px`;
    messageInput.style.overflowY = contentHeight > maximum ? 'auto' : 'hidden';
  };
  const syncCounter = () => {
    counter.textContent = `${messageInput.value.length} / 300`;
    resizeMessageInput();
  };
  messageInput.addEventListener('input', syncCounter);
  let lastInputWidth = 0;
  const inputObserver = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === lastInputWidth) return;
    lastInputWidth = entry.contentRect.width;
    resizeMessageInput();
  });
  inputObserver.observe(messageInput);
  document.fonts.ready.then(resizeMessageInput);

  const createCard = ({ id, name, message, createdAt }) => {
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
    if (adminCsrf && id) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'message-delete';
      button.textContent = '삭제';
      button.setAttribute('aria-label', `${name}님의 메시지 삭제`);
      button.addEventListener('click', async () => {
        if (!window.confirm('이 메시지를 삭제할까요? 삭제한 메시지는 복구할 수 없습니다.')) return;
        button.disabled = true;
        button.textContent = '삭제 중…';
        try {
          await adminRequest(`/${encodeURIComponent(id)}`, 'DELETE');
          allMessages = allMessages.filter(item => item.id !== id);
          displayMessages();
          boardStatus.textContent = '메시지가 삭제되었습니다.';
          boardStatus.hidden = false;
        } catch (error) {
          boardStatus.textContent = error.message;
          boardStatus.hidden = false;
          button.disabled = false;
          button.textContent = '삭제';
        }
      });
      card.append(button);
    }
    return card;
  };

  const normalizeMessages = messages => {
    if (!Array.isArray(messages)) return [];
    return messages
      .map(({ id, nickname, name, message, created_at }) => ({
        id,
        name: nickname || name || '',
        message: message || '',
        createdAt: created_at || '',
      }))
      .filter(item => item.name && item.message);
  };

  const readMessages = async () => {
    if (!apiEndpoint) {
      throw new Error('Message API endpoint is missing.');
    }

    const response = await fetch(apiEndpoint, {
      cache: 'no-store',
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
    board.replaceChildren(...containers);
    // Place each chronological message in the shortest rendered column.
    // Measuring live cards accounts for wrapping, dates and the actual column width.
    const heights = containers.map(() => 0);
    ordered.slice(0, visibleCount).forEach(item => {
      const columnIndex = heights.indexOf(Math.min(...heights));
      const column = containers[columnIndex];
      column.append(createCard(item));
      heights[columnIndex] = column.getBoundingClientRect().height;
    });
    more.hidden = visibleCount >= ordered.length;
  };

  const setAdminSession = session => {
    adminCsrf = session.authenticated && typeof session.csrf === 'string' ? session.csrf : '';
    adminForm.hidden = Boolean(adminCsrf) || !secureAdmin;
    adminSession.hidden = !adminCsrf;
    adminButton.setAttribute('aria-label', adminCsrf ? '메시지 관리자 메뉴' : '메시지 관리자 로그인');
    displayMessages();
  };
  const adminRequest = async (path, method = 'GET', body) => {
    if (!apiEndpoint) throw new Error('관리자 로그인에 연결할 수 없습니다.');
    if (!secureAdmin && method !== 'GET') throw new Error('관리자 기능은 HTTPS 보안 연결에서만 사용할 수 있습니다.');
    const response = await fetch(`${apiEndpoint.replace(/\/$/, '')}${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Sejong-Admin': '1',
        'X-Sejong-CSRF': adminCsrf,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && !path.endsWith('/login')) setAdminSession({ authenticated: false });
      throw new Error(payload.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
    return payload;
  };
  adminButton.addEventListener('click', async () => {
    adminStatus.textContent = '로그인 상태를 확인하는 중…';
    adminDialog.showModal();
    try {
      setAdminSession(await adminRequest('/admin/session'));
      adminStatus.textContent = '';
    } catch (error) {
      adminStatus.textContent = error.message;
    }
  });
  document.querySelector('#message-admin-close').addEventListener('click', () => adminDialog.close());
  adminDialog.addEventListener('close', () => {
    adminForm.querySelector('[name="password"]').value = '';
  });
  adminForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = adminForm.querySelector('button[type="submit"]');
    button.disabled = true;
    adminStatus.textContent = '로그인하는 중…';
    const data = new FormData(adminForm);
    try {
      await adminRequest('/admin/login', 'POST', {
        username: data.get('username').trim(),
        password: data.get('password'),
      });
      const session = await adminRequest('/admin/session');
      if (!session.authenticated) throw new Error('로그인 쿠키를 저장하지 못했습니다. 브라우저의 쿠키 설정을 확인해주세요.');
      setAdminSession(session);
      adminForm.reset();
      adminStatus.textContent = '';
      adminDialog.close();
      boardStatus.textContent = '관리자로 로그인했습니다. 삭제할 메시지의 삭제 버튼을 눌러주세요.';
      boardStatus.hidden = false;
      boardStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      adminStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      setAdminSession(await adminRequest('/admin/session', 'DELETE'));
      adminStatus.textContent = '로그아웃했습니다.';
      boardStatus.textContent = '';
      boardStatus.hidden = true;
    } catch (error) {
      adminStatus.textContent = error.message;
    } finally {
      logoutButton.disabled = false;
    }
  });
  adminRequest('/admin/session').then(setAdminSession).catch(() => {});
  sort.addEventListener('change', () => { visibleCount = 12; displayMessages(); });
  more.addEventListener('click', () => { visibleCount += 12; displayMessages(); });
  let layoutFrame;
  let lastBoardWidth = 0;
  const resizeObserver = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === lastBoardWidth) return;
    lastBoardWidth = entry.contentRect.width;
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(displayMessages);
  });
  resizeObserver.observe(board);
  document.fonts.ready.then(displayMessages);
  const renderMessages = async () => {
    const messages = await readMessages();
    boardStatus.textContent = '';
    boardStatus.hidden = true;
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
    boardStatus.textContent = '메시지를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
    boardStatus.hidden = false;
    board.replaceChildren(...initialMessages.map(createCard));
  });
})();
