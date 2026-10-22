<?php
/**
 * Plugin Name: Sejong Message API
 * Description: 졸업전시 MESSAGE 페이지용 공개 REST API와 관리자 로그인·삭제 기능을 제공합니다.
 * Version: 1.1.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SEJONG_MESSAGE_API_VERSION', '1.1.0');
define('SEJONG_MESSAGE_ADMIN_COOKIE', 'sejong_message_admin');
define('SEJONG_MESSAGE_ADMIN_PASSWORD_HASH', '$2y$12$nQHXWbeLvjMAGTjVFrTEzempC1OGD1ncIZZ9MT0DmWCuvjrV6dx/S');

function sejong_message_table_name() {
    global $wpdb;
    return $wpdb->prefix . 'sejong_messages';
}

function sejong_message_api_activate() {
    global $wpdb;

    $table_name = sejong_message_table_name();
    $charset_collate = $wpdb->get_charset_collate();

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $sql = "CREATE TABLE {$table_name} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        nickname varchar(20) NOT NULL,
        message varchar(300) NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY created_at (created_at)
    ) {$charset_collate};";

    dbDelta($sql);
}
register_activation_hook(__FILE__, 'sejong_message_api_activate');

function sejong_message_api_cors() {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? esc_url_raw($_SERVER['HTTP_ORIGIN']) : '';

    $allowed_origins = array(
        'https://yangjunho-m.github.io',
    );

    // sj-di.com으로 프론트를 이전했을 때도 동작하도록 허용.
    if ($origin === 'http://sj-di.com' || $origin === 'https://sj-di.com') {
        $allowed_origins[] = $origin;
    }

    if ($origin && in_array($origin, $allowed_origins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
}
add_action('rest_api_init', 'sejong_message_api_cors', 5);

function sejong_message_api_register_routes() {
    register_rest_route('sejong/v1', '/messages', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'sejong_message_get_messages',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'sejong_message_create_message',
            'permission_callback' => '__return_true',
        ),
    ));
    register_rest_route('sejong/v1', '/messages/admin/login', array(
        'methods' => WP_REST_Server::CREATABLE,
        'callback' => 'sejong_message_admin_login',
        'permission_callback' => 'sejong_message_admin_same_origin',
    ));
    register_rest_route('sejong/v1', '/messages/admin/session', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'sejong_message_admin_status',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => WP_REST_Server::DELETABLE,
            'callback' => 'sejong_message_admin_logout',
            'permission_callback' => 'sejong_message_admin_can_delete',
        ),
    ));
    register_rest_route('sejong/v1', '/messages/(?P<id>[1-9][0-9]*)', array(
        'methods' => WP_REST_Server::DELETABLE,
        'callback' => 'sejong_message_delete_message',
        'permission_callback' => 'sejong_message_admin_can_delete',
        'args' => array('id' => array('validate_callback' => function ($value) {
            return filter_var($value, FILTER_VALIDATE_INT, array('options' => array('min_range' => 1))) !== false;
        })),
    ));
}
add_action('rest_api_init', 'sejong_message_api_register_routes');

function sejong_message_admin_same_origin(WP_REST_Request $request) {
    if (!is_ssl()) {
        return new WP_Error('sejong_admin_https', '관리자 기능은 HTTPS 보안 연결에서만 사용할 수 있습니다.', array('status' => 403));
    }
    $origin = $request->get_header('origin');
    $site = wp_parse_url(home_url());
    $expected_origin = $site['scheme'] . '://' . $site['host'] . (isset($site['port']) ? ':' . $site['port'] : '');
    // A custom header blocks cross-site form submissions, including requests without Origin.
    if ($request->get_header('x-sejong-admin') !== '1' || ($origin && $origin !== $expected_origin)) {
        return new WP_Error('sejong_admin_origin', '사이트 안에서 다시 시도해주세요.', array('status' => 403));
    }
    return true;
}

function sejong_message_admin_session_key() {
    $token = isset($_COOKIE[SEJONG_MESSAGE_ADMIN_COOKIE]) ? $_COOKIE[SEJONG_MESSAGE_ADMIN_COOKIE] : '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) {
        return '';
    }
    return 'sejong_admin_' . hash('sha256', $token);
}

function sejong_message_admin_session() {
    $key = sejong_message_admin_session_key();
    return $key ? get_transient($key) : false;
}

function sejong_message_admin_response($data) {
    return new WP_REST_Response($data, 200, array(
        'Cache-Control' => 'no-store, private',
        'Vary' => 'Cookie, Origin',
    ));
}

function sejong_message_admin_cookie($token, $expires) {
    setcookie(SEJONG_MESSAGE_ADMIN_COOKIE, $token, array(
        'expires' => $expires,
        'path' => wp_parse_url(rest_url('sejong/v1/messages'), PHP_URL_PATH),
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Strict',
    ));
}

function sejong_message_admin_status() {
    $session = sejong_message_admin_session();
    return sejong_message_admin_response(array(
        'authenticated' => (bool) $session,
        'csrf' => $session ? $session['csrf'] : '',
    ));
}

function sejong_message_admin_login(WP_REST_Request $request) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    $rate_key = 'sejong_admin_login_' . md5($ip);
    $attempts = (int) get_transient($rate_key);
    if ($attempts >= 5) {
        return new WP_Error('sejong_admin_rate_limited', '로그인 시도가 많습니다. 15분 후 다시 시도해주세요.', array('status' => 429));
    }
    $username = $request->get_param('username');
    $password = $request->get_param('password');
    $valid_password = is_string($password) && strlen($password) <= 1024
        && password_verify($password, SEJONG_MESSAGE_ADMIN_PASSWORD_HASH);
    if ($username !== 'sejongdi' || !$valid_password) {
        set_transient($rate_key, $attempts + 1, 15 * MINUTE_IN_SECONDS);
        return new WP_Error('sejong_admin_credentials', '아이디 또는 비밀번호가 올바르지 않습니다.', array('status' => 401));
    }
    $token = bin2hex(random_bytes(32));
    $session = array('csrf' => bin2hex(random_bytes(32)));
    if (!set_transient('sejong_admin_' . hash('sha256', $token), $session, 8 * HOUR_IN_SECONDS)) {
        return new WP_Error('sejong_admin_session_failed', '로그인을 완료하지 못했습니다. 다시 시도해주세요.', array('status' => 500));
    }
    $old_key = sejong_message_admin_session_key();
    if ($old_key) delete_transient($old_key);
    delete_transient($rate_key);
    sejong_message_admin_cookie($token, time() + 8 * HOUR_IN_SECONDS);
    return sejong_message_admin_response(array('authenticated' => true, 'csrf' => $session['csrf']));
}

function sejong_message_admin_can_delete(WP_REST_Request $request) {
    $origin_check = sejong_message_admin_same_origin($request);
    if (is_wp_error($origin_check)) return $origin_check;
    $session = sejong_message_admin_session();
    if (!$session) {
        return new WP_Error('sejong_admin_required', '관리자 로그인이 필요합니다.', array('status' => 401));
    }
    if (!hash_equals($session['csrf'], $request->get_header('x-sejong-csrf'))) {
        return new WP_Error('sejong_admin_csrf', '로그인 상태를 다시 확인해주세요.', array('status' => 403));
    }
    return true;
}

function sejong_message_admin_logout() {
    delete_transient(sejong_message_admin_session_key());
    sejong_message_admin_cookie('', time() - HOUR_IN_SECONDS);
    return sejong_message_admin_response(array('authenticated' => false, 'csrf' => ''));
}

function sejong_message_delete_message(WP_REST_Request $request) {
    global $wpdb;
    $deleted = $wpdb->delete(sejong_message_table_name(), array('id' => (int) $request['id']), array('%d'));
    if ($deleted === false) {
        return new WP_Error('sejong_db_error', '메시지를 삭제하지 못했습니다.', array('status' => 500));
    }
    if (!$deleted) {
        return new WP_Error('sejong_message_not_found', '이미 삭제되었거나 없는 메시지입니다.', array('status' => 404));
    }
    return sejong_message_admin_response(array('deleted' => true, 'id' => (int) $request['id']));
}

function sejong_message_get_messages(WP_REST_Request $request) {
    global $wpdb;

    $table_name = sejong_message_table_name();

    $rows = $wpdb->get_results(
        "SELECT id, nickname, message, created_at
         FROM {$table_name}
         ORDER BY created_at DESC, id DESC
         LIMIT 200",
        ARRAY_A
    );

    if ($rows === null && !empty($wpdb->last_error)) {
        return new WP_Error(
            'sejong_db_error',
            '메시지를 불러오지 못했습니다.',
            array('status' => 500)
        );
    }

    return rest_ensure_response($rows ?: array());
}

function sejong_message_create_message(WP_REST_Request $request) {
    global $wpdb;

    $params = $request->get_json_params();
    if (!is_array($params)) {
        $params = $request->get_params();
    }

    $nickname = isset($params['nickname']) ? sanitize_text_field($params['nickname']) : '';
    $message = isset($params['message']) ? sanitize_textarea_field($params['message']) : '';

    $nickname = trim($nickname);
    $message = trim($message);

    if ($nickname === '' || $message === '') {
        return new WP_Error(
            'sejong_required_fields',
            '닉네임과 메시지를 모두 입력해주세요.',
            array('status' => 400)
        );
    }

    if (mb_strlen($nickname, 'UTF-8') > 20) {
        return new WP_Error(
            'sejong_nickname_too_long',
            '닉네임은 20자 이하로 입력해주세요.',
            array('status' => 400)
        );
    }

    if (mb_strlen($message, 'UTF-8') > 300) {
        return new WP_Error(
            'sejong_message_too_long',
            '메시지는 300자 이하로 입력해주세요.',
            array('status' => 400)
        );
    }

    // 공개 방명록의 최소한의 도배 방지: 같은 IP는 5초 내 연속 등록 불가.
    $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
    $rate_key = 'sejong_msg_' . md5($ip);

    if (get_transient($rate_key)) {
        return new WP_Error(
            'sejong_rate_limited',
            '잠시 후 다시 등록해주세요.',
            array('status' => 429)
        );
    }

    $table_name = sejong_message_table_name();
    $inserted = $wpdb->insert(
        $table_name,
        array(
            'nickname' => $nickname,
            'message' => $message,
            'created_at' => current_time('mysql'),
        ),
        array('%s', '%s', '%s')
    );

    if ($inserted === false) {
        return new WP_Error(
            'sejong_db_error',
            '메시지를 저장하지 못했습니다.',
            array('status' => 500)
        );
    }

    set_transient($rate_key, 1, 5);

    $response = array(
        'id' => (int) $wpdb->insert_id,
        'nickname' => $nickname,
        'message' => $message,
        'created_at' => current_time('mysql'),
    );

    return new WP_REST_Response($response, 201);
}
