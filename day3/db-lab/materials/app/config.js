// Database configuration with Secrets Manager support
// Secrets Managerにシークレットがあれば使用、なければデフォルト値を使用

let config = {
  APP_DB_HOST: "YOUR_RDS_ENDPOINT_HERE",
  APP_DB_USER: "admin",
  APP_DB_PASSWORD: "password123",
  APP_DB_NAME: "employeedb"
};

let configReady = false;
let configCallbacks = [];

function onConfigReady(callback) {
  if (configReady) {
    callback();
  } else {
    configCallbacks.push(callback);
  }
}

function notifyConfigReady() {
  configReady = true;
  configCallbacks.forEach(cb => cb());
  configCallbacks = [];
}

// Try to load from Secrets Manager (AWS SDK v3)
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1"
});

const secretName = "Mydbsecret";

(async () => {
  try {
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
    if (response.SecretString) {
      const secret = JSON.parse(response.SecretString);
      if (secret.host) config.APP_DB_HOST = secret.host;
      if (secret.user) config.APP_DB_USER = secret.user;
      if (secret.password) config.APP_DB_PASSWORD = secret.password;
      if (secret.db) config.APP_DB_NAME = secret.db;
      console.log('[CONFIG] Loaded configuration from Secrets Manager.');
    }
  } catch (err) {
    console.log('[CONFIG] Secrets Manager not available. Using default values.');
  }
  notifyConfigReady();
})();

// Allow ENV overrides
Object.keys(config).forEach(key => {
  if (process.env[key] !== undefined) {
    config[key] = process.env[key];
  }
});

module.exports = { config, onConfigReady };
