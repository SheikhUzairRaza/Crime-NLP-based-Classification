import { Sequelize } from 'sequelize';
import config from '../config/config.js';
import { Officer, initOfficer } from './Officer.js';
import { Report, initReport } from './Report.js';
import { RefreshToken, initRefreshToken } from './RefreshToken.js';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging
  }
);

// Initialize models
initOfficer(sequelize);
initReport(sequelize);
initRefreshToken(sequelize);

// Collect models
export const models = {
  Officer,
  Report,
  RefreshToken
};

export { Officer, Report, RefreshToken };

// Run associations
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

export default {
  sequelize,
  Sequelize,
  ...models
};
