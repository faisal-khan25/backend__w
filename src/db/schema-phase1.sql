CREATE TABLE IF NOT EXISTS employee_profiles (
  user_id                    VARCHAR(36) PRIMARY KEY,
  employee_code               VARCHAR(20) UNIQUE,
  designation                 VARCHAR(120),
  work_type                   ENUM('OFFICE','REMOTE','HYBRID'),
  date_of_birth                DATE,
  gender                       ENUM('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY'),
  blood_group                  VARCHAR(5),
  marital_status               ENUM('SINGLE','MARRIED','DIVORCED','WIDOWED'),
  personal_email               VARCHAR(255),
  personal_phone               VARCHAR(20),
  work_phone                   VARCHAR(20),
  address_line1                VARCHAR(255),
  address_line2                VARCHAR(255),
  city                         VARCHAR(100),
  state                        VARCHAR(100),
  country                      VARCHAR(100),
  pincode                      VARCHAR(20),
  date_of_joining              DATE,
  reporting_manager_id         VARCHAR(36),
  pan_number                   VARCHAR(20),
  aadhaar_number                VARCHAR(20),
  emergency_contact_name       VARCHAR(150),
  emergency_contact_relation   VARCHAR(50),
  emergency_contact_phone      VARCHAR(20),
  emergency_contact_address    VARCHAR(255),
  created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_manager FOREIGN KEY (reporting_manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employee_education (
  id             VARCHAR(36) PRIMARY KEY,
  user_id        VARCHAR(36) NOT NULL,
  degree         VARCHAR(150) NOT NULL,
  institution    VARCHAR(200) NOT NULL,
  field_of_study VARCHAR(150),
  start_year     INT,
  end_year       INT,
  grade          VARCHAR(20),
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_education_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_education_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employee_skills (
  id          VARCHAR(36) PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL,
  skill_name  VARCHAR(100) NOT NULL,
  proficiency ENUM('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT') NOT NULL DEFAULT 'INTERMEDIATE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_skill_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_skill_user_name (user_id, skill_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employee_experience (
  id           VARCHAR(36) PRIMARY KEY,
  user_id      VARCHAR(36) NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  designation  VARCHAR(150) NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE,
  is_current   BOOLEAN NOT NULL DEFAULT FALSE,
  description  VARCHAR(1000),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_experience_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_experience_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS holidays (
  id          VARCHAR(36) PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  date        DATE NOT NULL,
  type        ENUM('COMPANY','PUBLIC','OPTIONAL') NOT NULL DEFAULT 'COMPANY',
  description VARCHAR(500),
  created_by  VARCHAR(36),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_holiday_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_holiday_date_name (date, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id           VARCHAR(36) PRIMARY KEY,
  user_id      VARCHAR(36) NOT NULL,
  type         ENUM('ANNOUNCEMENT','LEAVE_APPROVAL','ATTENDANCE_ALERT','PAYROLL','TASK','GENERAL') NOT NULL DEFAULT 'GENERAL',
  title        VARCHAR(200) NOT NULL,
  message      VARCHAR(1000) NOT NULL,
  reference_id VARCHAR(36),
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notification_user_read (user_id, is_read)
) ENGINE=InnoDB;
