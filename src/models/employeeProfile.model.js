const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WORK_TYPES = ['OFFICE', 'REMOTE', 'HYBRID'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
const MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];

const EmployeeProfile = sequelize.define(
  'EmployeeProfile',
  {
    userId: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      field: 'user_id',
    },
    employeeCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      field: 'employee_code',
    },
    designation: { type: DataTypes.STRING(120), allowNull: true },
    workType: { type: DataTypes.ENUM(...WORK_TYPES), allowNull: true, field: 'work_type' },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true, field: 'date_of_birth' },
    gender: { type: DataTypes.ENUM(...GENDERS), allowNull: true },
    bloodGroup: { type: DataTypes.STRING(5), allowNull: true, field: 'blood_group' },
    maritalStatus: { type: DataTypes.ENUM(...MARITAL_STATUSES), allowNull: true, field: 'marital_status' },
    personalEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'personal_email' },
    personalPhone: { type: DataTypes.STRING(20), allowNull: true, field: 'personal_phone' },
    workPhone: { type: DataTypes.STRING(20), allowNull: true, field: 'work_phone' },
    addressLine1: { type: DataTypes.STRING(255), allowNull: true, field: 'address_line1' },
    addressLine2: { type: DataTypes.STRING(255), allowNull: true, field: 'address_line2' },
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    country: { type: DataTypes.STRING(100), allowNull: true },
    pincode: { type: DataTypes.STRING(20), allowNull: true },
    dateOfJoining: { type: DataTypes.DATEONLY, allowNull: true, field: 'date_of_joining' },
    reportingManagerId: { type: DataTypes.STRING(36), allowNull: true, field: 'reporting_manager_id' },
    panNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'pan_number' },
    aadhaarNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'aadhaar_number' },
    emergencyContactName: { type: DataTypes.STRING(150), allowNull: true, field: 'emergency_contact_name' },
    emergencyContactRelation: { type: DataTypes.STRING(50), allowNull: true, field: 'emergency_contact_relation' },
    emergencyContactPhone: { type: DataTypes.STRING(20), allowNull: true, field: 'emergency_contact_phone' },
    emergencyContactAddress: { type: DataTypes.STRING(255), allowNull: true, field: 'emergency_contact_address' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    tableName: 'employee_profiles',
    timestamps: false,
    hooks: {
      beforeUpdate: (record) => {
        record.updatedAt = new Date();
      },
    },
  }
);

EmployeeProfile.WORK_TYPES = WORK_TYPES;
EmployeeProfile.GENDERS = GENDERS;
EmployeeProfile.MARITAL_STATUSES = MARITAL_STATUSES;

module.exports = EmployeeProfile;
