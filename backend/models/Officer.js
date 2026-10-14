import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';

export class Officer extends Model {
  /**
   * Password validation helper method
   * @param {string} password - Plain text password to check
   * @returns {Promise<boolean>}
   */
  async validatePassword(password) {
    if (!this.password_hash || !password) return false;
    return bcrypt.compare(password, this.password_hash);
  }

  /**
   * Exclude password_hash from JSON serialization
   */
  toJSON() {
    const values = { ...this.get() };
    delete values.password_hash;
    return values;
  }

  static associate(models) {
    this.hasMany(models.Report, {
      foreignKey: 'officer_id',
      as: 'reports'
    });
    this.hasMany(models.RefreshToken, {
      foreignKey: 'officer_id',
      as: 'refreshTokens'
    });
  }
}

export const initOfficer = (sequelize) => {
  Officer.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Officer name cannot be empty' }
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          msg: 'Email address already registered'
        },
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
          notEmpty: { msg: 'Email cannot be empty' }
        }
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Password hash cannot be empty' }
        }
      },
      role: {
        type: DataTypes.ENUM('admin', 'officer'),
        allowNull: false,
        defaultValue: 'officer',
        validate: {
          isIn: {
            args: [['admin', 'officer']],
            msg: 'Role must be either admin or officer'
          }
        }
      }
    },
    {
      sequelize,
      modelName: 'Officer',
      tableName: 'officers',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      hooks: {
        beforeSave: async (officer) => {
          // Automatic bcrypt hashing if plain-text password is provided
          if (officer.changed('password_hash') && !officer.password_hash.startsWith('$2')) {
            const salt = await bcrypt.genSalt(10);
            officer.password_hash = await bcrypt.hash(officer.password_hash, salt);
          }
        }
      }
    }
  );

  return Officer;
};

export default initOfficer;
