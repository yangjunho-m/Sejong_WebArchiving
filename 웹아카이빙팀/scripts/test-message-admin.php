<?php
// Run: SEJONG_TEST_PASSWORD=<admin password> php scripts/test-message-admin.php
define('ABSPATH', __DIR__ . '/');
define('MINUTE_IN_SECONDS', 60);
define('HOUR_IN_SECONDS', 3600);
$transients = array();
$routes = array();
class WP_Error {
    public function __construct(public $code, public $message, public $data) {}
}
class WP_REST_Response {
    public function __construct(public $data, public $status = 200, public $headers = array()) {}
}
class WP_REST_Server {
    const READABLE = 'GET', CREATABLE = 'POST', DELETABLE = 'DELETE';
}
class WP_REST_Request implements ArrayAccess {
    public function __construct(public $params = array(), public $headers = array()) {}
    public function get_param($key) { return $this->params[$key] ?? null; }
    public function get_header($key) { return $this->headers[strtolower($key)] ?? ''; }
    public function offsetGet($key): mixed { return $this->get_param($key); }
    public function offsetExists($key): bool { return isset($this->params[$key]); }
    public function offsetSet($key, $value): void { $this->params[$key] = $value; }
    public function offsetUnset($key): void { unset($this->params[$key]); }
}
function register_activation_hook(...$args) {}
function add_action(...$args) {}
function register_rest_route($namespace, $path, $options) { $GLOBALS['routes'][$path] = $options; }
function home_url() { return 'https://sj-di.com'; }
function rest_url($path) { return home_url() . '/wp-json/' . $path; }
function wp_parse_url(...$args) { return parse_url(...$args); }
function is_ssl() { return $GLOBALS['test_ssl'] ?? true; }
function is_wp_error($value) { return $value instanceof WP_Error; }
function get_transient($key) { return $GLOBALS['transients'][$key] ?? false; }
function set_transient($key, $value, $ttl) { $GLOBALS['transients'][$key] = $value; return true; }
function delete_transient($key) { unset($GLOBALS['transients'][$key]); }
function check($condition, $description) {
    if (!$condition) throw new RuntimeException($description);
}
function error_status($value, $expected) {
    check($value instanceof WP_Error && $value->data['status'] === $expected, 'Expected error ' . $expected);
}
require __DIR__ . '/../server/sejong-message-api/sejong-message-api.php';
$password = getenv('SEJONG_TEST_PASSWORD');
check(is_string($password) && $password !== '', 'Set SEJONG_TEST_PASSWORD to test successful login.');
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$headers = array('origin' => home_url(), 'x-sejong-admin' => '1');
$request = new WP_REST_Request(array(), $headers);
sejong_message_api_register_routes();
check($routes['/messages/(?P<id>[1-9][0-9]*)']['permission_callback'] === 'sejong_message_admin_can_delete', 'Delete route must require authentication.');
check($routes['/messages/admin/login']['permission_callback'] === 'sejong_message_admin_same_origin', 'Login must check origin.');
check($routes['/messages'][0]['permission_callback'] === '__return_true', 'Guest reads remain public.');
check($routes['/messages'][1]['permission_callback'] === '__return_true', 'Guest posts remain public.');
check(sejong_message_admin_status()->data['authenticated'] === false, 'Guest status');
check(sejong_message_admin_status()->headers['Cache-Control'] === 'no-store, private', 'Private status must not be cached.');
error_status(sejong_message_admin_can_delete($request), 401);
error_status(sejong_message_admin_same_origin(new WP_REST_Request()), 403);
$test_ssl = false;
error_status(sejong_message_admin_same_origin($request), 403);
$test_ssl = true;
error_status(sejong_message_admin_same_origin(new WP_REST_Request(array(), array('origin' => 'http://evil.example', 'x-sejong-admin' => '1'))), 403);
$_COOKIE[SEJONG_MESSAGE_ADMIN_COOKIE] = array('invalid');
error_status(sejong_message_admin_can_delete($request), 401);
unset($_COOKIE[SEJONG_MESSAGE_ADMIN_COOKIE]);
$invalid = new WP_REST_Request(array('username' => 'sejongdi', 'password' => array('bad')), $headers);
for ($i = 0; $i < 5; $i++) error_status(sejong_message_admin_login($invalid), 401);
error_status(sejong_message_admin_login($invalid), 429);
$transients = array();
error_status(sejong_message_admin_login(new WP_REST_Request(array('username' => 'other', 'password' => $password), $headers)), 401);
$login = sejong_message_admin_login(new WP_REST_Request(array('username' => 'sejongdi', 'password' => $password), $headers));
check($login->data['authenticated'] && strlen($login->data['csrf']) === 64, 'Correct password logs in.');
// The browser receives a random cookie; seed a known token to exercise session checks.
$token = bin2hex(random_bytes(32));
$_COOKIE[SEJONG_MESSAGE_ADMIN_COOKIE] = $token;
set_transient('sejong_admin_' . hash('sha256', $token), array('csrf' => $login->data['csrf']), 28800);
error_status(sejong_message_admin_can_delete($request), 403);
$request->headers['x-sejong-csrf'] = 'wrong';
error_status(sejong_message_admin_can_delete($request), 403);
$request->headers['x-sejong-csrf'] = $login->data['csrf'];
check(sejong_message_admin_can_delete($request) === true, 'Authenticated deletion with CSRF succeeds.');
$wpdb = new class {
    public $prefix = 'wp_', $result = 1, $lastDelete;
    public function delete(...$args) { $this->lastDelete = $args; return $this->result; }
};
$request->params['id'] = '42';
check(sejong_message_delete_message($request)->data['deleted'] === true, 'Delete succeeds.');
check($wpdb->lastDelete === array('wp_sejong_messages', array('id' => 42), array('%d')), 'Only the selected ID is deleted.');
$wpdb->result = 0;
error_status(sejong_message_delete_message($request), 404);
$wpdb->result = false;
error_status(sejong_message_delete_message($request), 500);
$validate = $routes['/messages/(?P<id>[1-9][0-9]*)']['args']['id']['validate_callback'];
check($validate('42') && !$validate('0') && !$validate('-1') && !$validate('1 OR 1=1') && !$validate(str_repeat('9', 30)), 'Validate message IDs.');
sejong_message_admin_logout();
check(sejong_message_admin_status()->data['authenticated'] === false, 'Logout invalidates server session.');
error_status(sejong_message_admin_can_delete($request), 401);
echo "PASS: admin login, rate limit, origin, CSRF, permissions, deletion and logout\n";
