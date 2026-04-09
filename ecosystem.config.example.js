module.exports = {
  apps: [{
    name: 'Oura',
    script: 'node_modules/.bin/next',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3005,
      GOOGLE_CLIENT_ID: 'your_google_client_id',
      GOOGLE_CLIENT_SECRET: 'your_google_client_secret',
      NEXTAUTH_URL: 'http://localhost:3005',
      NEXTAUTH_SECRET: 'generate_a_random_secret',
      OURA_TOKEN: 'your_oura_personal_access_token',
      OPENROUTER_API_KEY: 'your_openrouter_api_key',
      WITHINGS_CLIENT_ID: 'your_withings_client_id',
      WITHINGS_CLIENT_SECRET: 'your_withings_client_secret',
    },
  }],
};
