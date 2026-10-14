/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('refresh_tokens', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    officer_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'officers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    token: {
      type: Sequelize.STRING(500),
      allowNull: false
    },
    is_revoked: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  // Indexes for fast querying
  await queryInterface.addIndex('refresh_tokens', ['officer_id']);
  await queryInterface.addIndex('refresh_tokens', ['token']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('refresh_tokens');
}

export default { up, down };
