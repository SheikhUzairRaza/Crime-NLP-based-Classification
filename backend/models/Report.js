import { Model, DataTypes } from 'sequelize';
import crypto from 'crypto';

export class Report extends Model {
  /**
   * Helper static method to generate standard tracking ID:
   * Format: CRIME-<YEAR>-<10 HEX CHARS> (e.g. CRIME-2026-A83B4C91D2)
   */
  static generateTrackingId() {
    const year = new Date().getFullYear();
    const hex = crypto.randomBytes(5).toString('hex').toUpperCase(); // 5 bytes = 10 hex characters
    return `CRIME-${year}-${hex}`;
  }

  /**
   * Public representation for citizen tracking (Hides private citizen & internal officer details)
   */
  toPublicJSON() {
    return {
      tracking_id: this.tracking_id,
      incident_location: this.incident_location,
      incident_date: this.incident_date,
      status: this.status,
      predicted_category: this.predicted_category,
      domain: this.domain,
      severity: this.severity,
      safety_advisory: this.safety_advisory,
      classified_at: this.classified_at,
      created_at: this.created_at,
      assigned_officer: this.officer ? this.officer.name : null
    };
  }

  static associate(models) {
    this.belongsTo(models.Officer, {
      foreignKey: 'officer_id',
      as: 'officer',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  }
}

export const initReport = (sequelize) => {
  Report.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tracking_id: {
        type: DataTypes.STRING(40),
        allowNull: false,
        unique: {
          msg: 'Tracking ID must be unique'
        }
      },
      citizen_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Citizen name is required' }
        }
      },
      contact_number: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Contact number is required' }
        }
      },
      incident_location: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Incident location is required' }
        }
      },
      incident_date: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: { msg: 'Must be a valid incident date' },
          isNotFuture(value) {
            if (new Date(value) > new Date()) {
              throw new Error('Incident date cannot be in the future');
            }
          }
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          len: {
            args: [20, 10000],
            msg: 'Complaint description must be at least 20 characters long'
          }
        }
      },
      predicted_category: {
        type: DataTypes.STRING,
        allowNull: true
      },
      domain: {
        type: DataTypes.ENUM('Cyber', 'Physical'),
        allowNull: true,
        validate: {
          isIn: {
            args: [['Cyber', 'Physical']],
            msg: 'Domain must be either Cyber or Physical'
          }
        }
      },
      confidence_score: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          min: 0.0,
          max: 100.0
        }
      },
      severity: {
        type: DataTypes.ENUM('Critical', 'High', 'Medium'),
        allowNull: true,
        validate: {
          isIn: {
            args: [['Critical', 'High', 'Medium']],
            msg: 'Severity must be Critical, High, or Medium'
          }
        }
      },
      is_urgent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      safety_advisory: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      top_candidates: {
        type: DataTypes.JSON,
        allowNull: true
      },
      classified_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('Pending', 'Under Investigation', 'Resolved', 'Dismissed'),
        allowNull: false,
        defaultValue: 'Pending',
        validate: {
          isIn: {
            args: [['Pending', 'Under Investigation', 'Resolved', 'Dismissed']],
            msg: 'Invalid report status'
          }
        }
      },
      officer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'officers',
          key: 'id'
        }
      },
      officer_notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Report',
      tableName: 'reports',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      hooks: {
        beforeValidate: (report) => {
          // Auto-generate tracking_id if not explicitly provided
          if (!report.tracking_id) {
            report.tracking_id = Report.generateTrackingId();
          }
        }
      }
    }
  );

  return Report;
};

export default initReport;
