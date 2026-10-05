<?php
/**
 * Plugin Name: Sejong Pattern API
 * Description: 졸업전시 인터랙션 결과 패턴의 저장, 조회, QR 연동을 위한 REST API와 전용 DB 테이블을 제공합니다.
 * Version: 1.0.1
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SEJONG_PATTERN_API_VERSION', '1.0.1');
define('SEJONG_PATTERN_PAGE_URL', 'http://sj-di.com/2026-buttonup_interaction/');

function sejong_pattern_table_name() {
    global $wpdb;
    return $wpdb->prefix . 'sejong_patterns';
}

function sejong_pattern_activate() {
    global $wpdb;

    $table_name = sejong_pattern_table_name();
    $charset_collate = $wpdb->get_charset_collate();

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $sql = "CREATE TABLE {$table_name} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        payload longtext NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY created_at (created_at)
    ) {$charset_collate};";

    dbDelta($sql);
}
register_activation_hook(__FILE__, 'sejong_pattern_activate');

function sejong_pattern_cors() {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? esc_url_raw($_SERVER['HTTP_ORIGIN']) : '';

    $allowed_origins = array(
        'https://yangjunho-m.github.io',
        'http://sj-di.com',
        'https://sj-di.com',
    );

    if ($origin && in_array($origin, $allowed_origins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
}
add_action('rest_api_init', 'sejong_pattern_cors', 5);

function sejong_pattern_register_routes() {
    register_rest_route('sejong/v1', '/patterns', array(
        array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => 'sejong_pattern_get',
            'permission_callback' => '__return_true',
        ),
        array(
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => 'sejong_pattern_create',
            'permission_callback' => '__return_true',
        ),
    ));

    register_rest_route('sejong/v1', '/patterns/(?P<id>[0-9]+)', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'sejong_pattern_get',
        'permission_callback' => '__return_true',
    ));
}
add_action('rest_api_init', 'sejong_pattern_register_routes');

function sejong_pattern_url($id) {
    return add_query_arg('id', (int) $id, SEJONG_PATTERN_PAGE_URL);
}

function sejong_pattern_get($request) {
    global $wpdb;

    $id = (int) $request->get_param('id');
    if ($id <= 0) {
        return new WP_Error(
            'sejong_pattern_id_required',
            'Pattern id is required.',
            array('status' => 400)
        );
    }

    $table_name = sejong_pattern_table_name();
    $row = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT id, payload, created_at FROM {$table_name} WHERE id = %d",
            $id
        ),
        ARRAY_A
    );

    if (!$row) {
        return new WP_Error(
            'sejong_pattern_not_found',
            'Pattern not found.',
            array('status' => 404)
        );
    }

    $payload = json_decode($row['payload'], true);
    if (!is_array($payload)) {
        $payload = array();
    }

    return rest_ensure_response(array(
        'id' => (int) $row['id'],
        'url' => sejong_pattern_url((int) $row['id']),
        'payload' => $payload,
        'created_at' => $row['created_at'],
    ));
}

function sejong_pattern_create($request) {
    global $wpdb;

    $params = $request->get_json_params();
    if (!is_array($params)) {
        $params = $request->get_params();
    }

    if (isset($params['payload']) && is_array($params['payload'])) {
        $payload = $params['payload'];
    } else {
        $payload = $params;
    }

    if (!is_array($payload) || empty($payload)) {
        return new WP_Error(
            'sejong_pattern_payload_required',
            'Pattern payload is required.',
            array('status' => 400)
        );
    }

    $json = wp_json_encode($payload);
    if (!$json) {
        return new WP_Error(
            'sejong_pattern_invalid_json',
            'Pattern payload cannot be encoded.',
            array('status' => 400)
        );
    }

    if (strlen($json) > 1000000) {
        return new WP_Error(
            'sejong_pattern_payload_too_large',
            'Pattern payload is too large.',
            array('status' => 413)
        );
    }

    $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
    $rate_key = 'sejong_pattern_' . md5($ip);

    if (get_transient($rate_key)) {
        return new WP_Error(
            'sejong_pattern_rate_limited',
            'Please try again shortly.',
            array('status' => 429)
        );
    }

    $table_name = sejong_pattern_table_name();
    $inserted = $wpdb->insert(
        $table_name,
        array(
            'payload' => $json,
            'created_at' => current_time('mysql'),
        ),
        array('%s', '%s')
    );

    if ($inserted === false) {
        return new WP_Error(
            'sejong_pattern_db_error',
            'Pattern could not be saved.',
            array('status' => 500)
        );
    }

    $id = (int) $wpdb->insert_id;
    set_transient($rate_key, 1, 2);

    return new WP_REST_Response(array(
        'id' => $id,
        'url' => sejong_pattern_url($id),
        'created_at' => current_time('mysql'),
    ), 201);
}
