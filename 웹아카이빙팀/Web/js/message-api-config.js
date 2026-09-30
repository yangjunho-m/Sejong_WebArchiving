window.MESSAGE_API_CONFIG = {
  endpoint: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://sj-di.com/wp-json/sejong/v1/messages'
    : '/wp-json/sejong/v1/messages',
};
