import { Model, DataTypes } from 'sequelize';

export class RefreshToken extends Model {
  static associate(models) {
    this.belongsTo(models.Officer, {
      foreignKey: 'officer_id',
      as: 'officer'
    });
  }
}

export const initRefreshToken = (sequelize) => {
  RefreshToken.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      officer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'officers',
          key: 'id'
        }
      },
      token: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      is_revoked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: 'RefreshToken',
      tableName: 'refresh_tokens',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  return RefreshToken;
};

export default initRefreshToken;
