// Run with Playwright available on NODE_PATH: node scripts/test-message-admin.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../Web');
const server = http.createServer(async (req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await fs.readFile(file);
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let authenticated = false;
      let deleteFailure = false;
      let message = { id: '42', nickname: '테스트 방문자', message: '<script>unsafe</script> 응원합니다!', created_at: '2026-10-23 12:00:00' };
      await page.route('https://sj-di.com/**', async route => {
        const pathname = new URL(route.request().url()).pathname;
        const response = await route.fetch({ url: `http://127.0.0.1:${server.address().port}${pathname}` });
        await route.fulfill({ response });
      });
      await page.route('**/wp-json/sejong/v1/messages**', async route => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        let status = 200;
        let payload;
        if (pathname.endsWith('/admin/login')) {
          assert.equal(request.headers()['x-sejong-admin'], '1');
          const body = request.postDataJSON();
          authenticated = body.username === 'sejongdi' && body.password === 'test-password';
          status = authenticated ? 200 : 401;
          payload = authenticated ? { authenticated: true, csrf: 'test-csrf' } : { message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
        } else if (pathname.endsWith('/admin/session')) {
          if (request.method() === 'DELETE') {
            assert.equal(request.headers()['x-sejong-csrf'], 'test-csrf');
            authenticated = false;
          }
          payload = { authenticated, csrf: authenticated ? 'test-csrf' : '' };
        } else if (request.method() === 'DELETE') {
          assert.equal(pathname.endsWith('/42'), true);
          assert.equal(request.headers()['x-sejong-csrf'], 'test-csrf');
          if (!authenticated) { status = 401; payload = { message: '관리자 로그인이 필요합니다.' }; }
          else if (deleteFailure) { status = 500; payload = { message: '메시지를 삭제하지 못했습니다.' }; }
          else { message = null; payload = { deleted: true, id: 42 }; }
        } else { payload = message ? [message] : []; }
        await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      });
      await page.goto('https://sj-di.com/html/message.html');
      await page.locator('.message-card').waitFor();
      assert.equal(await page.locator('.message-delete').count(), 0);
      assert.equal(await page.locator('.message-card-message').textContent(), message.message);
      const logo = page.locator('#footer button.footer-symbol');
      await logo.click();
      await page.screenshot({ path: path.join(require('node:os').tmpdir(), `sejong-admin-dialog-${width}.png`) });
      await page.locator('#message-admin-username').fill('sejongdi');
      await page.locator('#message-admin-password').fill('wrong');
      await page.locator('#message-admin-login button').click();
      await page.getByText('아이디 또는 비밀번호가 올바르지 않습니다.', { exact: true }).waitFor();
      assert.equal(await page.locator('.message-delete').count(), 0);
      await page.locator('#message-admin-password').fill('test-password');
      await page.locator('#message-admin-login button').click();
      await page.locator('.message-delete').waitFor();
      assert.equal(await page.locator('#message-admin-dialog').isVisible(), false);
      await page.reload();
      await page.locator('.message-delete').waitFor();
      await page.screenshot({ path: path.join(require('node:os').tmpdir(), `sejong-admin-board-${width}.png`), fullPage: true });
      page.once('dialog', dialog => dialog.dismiss());
      await page.locator('.message-delete').click();
      assert.equal(await page.locator('.message-card').count(), 1);
      deleteFailure = true;
      page.once('dialog', dialog => dialog.accept());
      await page.locator('.message-delete').click();
      await page.getByText('메시지를 삭제하지 못했습니다.', { exact: true }).waitFor();
      assert.equal(await page.locator('.message-card').count(), 1);
      deleteFailure = false;
      await logo.click();
      await page.locator('#message-admin-logout').click();
      await page.getByText('로그아웃했습니다.', { exact: true }).waitFor();
      assert.equal(await page.locator('.message-delete').count(), 0);
      await page.locator('#message-admin-password').fill('test-password');
      await page.locator('#message-admin-username').fill('sejongdi');
      await page.locator('#message-admin-login button').click();
      await page.locator('.message-delete').waitFor();
      authenticated = false;
      page.once('dialog', dialog => dialog.accept());
      await page.locator('.message-delete').click();
      await page.getByText('관리자 로그인이 필요합니다.', { exact: true }).waitFor();
      assert.equal(await page.locator('.message-delete').count(), 0);
      await logo.click();
      await page.locator('#message-admin-password').fill('test-password');
      await page.locator('#message-admin-username').fill('sejongdi');
      await page.locator('#message-admin-login button').click();
      await page.locator('.message-delete').waitFor();
      page.once('dialog', dialog => dialog.accept());
      await page.locator('.message-delete').click();
      await page.getByText('메시지가 삭제되었습니다.', { exact: true }).waitFor();
      assert.equal(await page.locator('.message-card').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await page.close();
    }
    const insecurePage = await browser.newPage();
    let insecureWrites = 0;
    await insecurePage.route('http://sj-di.com/**', async route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (request.method() !== 'GET') insecureWrites++;
      if (pathname.includes('/wp-json/')) {
        await route.fulfill({ contentType: 'application/json', body: pathname.endsWith('/session') ? '{"authenticated":false}' : '[]' });
      } else {
        const response = await route.fetch({ url: `http://127.0.0.1:${server.address().port}${pathname}` });
        await route.fulfill({ response });
      }
    });
    await insecurePage.goto('http://sj-di.com/html/message.html');
    await insecurePage.locator('#footer button.footer-symbol').click();
    await insecurePage.locator('#message-admin-https').waitFor();
    assert.equal(await insecurePage.locator('#message-admin-login').isVisible(), false);
    assert.equal(await insecurePage.locator('#message-admin-https a').getAttribute('href'), 'https://sj-di.com/html/message.html');
    await insecurePage.locator('#message-admin-login').dispatchEvent('submit');
    await insecurePage.getByText('관리자 기능은 HTTPS 보안 연결에서만 사용할 수 있습니다.', { exact: true }).waitFor();
    assert.equal(insecureWrites, 0);
    await insecurePage.close();
    console.log('PASS: desktop/mobile guest, login, restored session, cancel, delete failure, logout, expiry, deletion and HTTP login protection');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
