/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('reports', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    tracking_id: {
      type: Sequelize.STRING(40),
      allowNull: false,
      unique: true
    },
    citizen_name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    contact_number: {
      type: Sequelize.STRING,
      allowNull: false
    },
    incident_location: {
      type: Sequelize.STRING,
      allowNull: false
    },
    incident_date: {
      type: Sequelize.DATE,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    predicted_category: {
      type: Sequelize.STRING,
      allowNull: true
    },
    domain: {
      type: Sequelize.ENUM('Cyber', 'Physical'),
      allowNull: true
    },
    confidence_score: {
      type: Sequelize.FLOAT,
      allowNull: true
    },
    severity: {
      type: Sequelize.ENUM('Critical', 'High', 'Medium'),
      allowNull: true
    },
    is_urgent: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    safety_advisory: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    top_candidates: {
      type: Sequelize.JSON,
      allowNull: true
    },
    classified_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    status: {
      type: Sequelize.ENUM('Pending', 'Under Investigation', 'Resolved', 'Dismissed'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    officer_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'officers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    officer_notes: {
      type: Sequelize.TEXT,
      allowNull: true
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

  // Indexes for high-performance querying and filtering
  await queryInterface.addIndex('reports', ['tracking_id']);
  await queryInterface.addIndex('reports', ['status']);
  await queryInterface.addIndex('reports', ['domain']);
  await queryInterface.addIndex('reports', ['severity']);
  await queryInterface.addIndex('reports', ['is_urgent']);
  await queryInterface.addIndex('reports', ['officer_id']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('reports');
}

export default { up, down };
