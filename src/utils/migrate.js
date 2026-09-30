const sequelize = require('../config/db');



async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = :table
        AND COLUMN_NAME  = :column`,
    { replacements: { table, column }, type: sequelize.QueryTypes.SELECT }
  );
  return Number(rows.cnt) > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (!(await columnExists(table, column))) {
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[migrate] Added column ${table}.${column}`);
  }
}


async function addEnumValueIfMissing(table, column, value, { notNull = true, defaultValue = null } = {}) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = :table
        AND COLUMN_NAME  = :column`,
    { replacements: { table, column }, type: sequelize.QueryTypes.SELECT }
  );
  if (!rows) return;

  const currentType = rows.COLUMN_TYPE || '';
  if (currentType.includes(`'${value}'`)) return;

  const existing = [...currentType.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const newType = `ENUM(${[...existing, value].map((v) => `'${v}'`).join(',')})`;

  const isNullable = rows.IS_NULLABLE === 'YES';
  const currentDefault = rows.COLUMN_DEFAULT;
  const nullClause = isNullable ? 'NULL' : 'NOT NULL';
  const defaultClause = currentDefault !== null ? `DEFAULT '${currentDefault}'` : '';

  await sequelize.query(
    `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${newType} ${nullClause} ${defaultClause}`
  );
  console.log(`[migrate] Added ENUM value '${value}' to ${table}.${column}`);
}

async function indexExists(table, indexName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = :table
        AND INDEX_NAME   = :indexName`,
    { replacements: { table, indexName }, type: sequelize.QueryTypes.SELECT }
  );
  return Number(rows.cnt) > 0;
}

async function addIndexIfMissing(table, indexName, columns) {
  if (await indexExists(table, indexName)) return;
  const columnList = columns.map((c) => `\`${c}\``).join(', ');
  await sequelize.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columnList})`);
  console.log(`[migrate] Added index ${table}.${indexName}`);
}

async function patchNotifications() {
  await addColumnIfMissing(
    'notifications',
    'reference_type',
    "VARCHAR(30) NULL DEFAULT NULL AFTER `reference_id`"
  );

  for (const val of ['CHAT', 'EMAIL', 'DRIVE', 'DOCUMENT', 'CALENDAR']) {
    await addEnumValueIfMissing('notifications', 'type', val);
  }
}

async function patchEmailTables() {
  await addColumnIfMissing(
    'email_messages',
    'sender_trashed_at',
    'DATETIME NULL DEFAULT NULL AFTER `sender_trashed`'
  );

  await addColumnIfMissing(
    'email_recipients',
    'is_spam',
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER `trashed_at`'
  );
  await addColumnIfMissing(
    'email_recipients',
    'spam_at',
    'DATETIME NULL DEFAULT NULL AFTER `is_spam`'
  );
  await addIndexIfMissing('email_recipients', 'idx_email_recipients_user_spam', ['user_id', 'is_spam']);
}

async function patchDriveTables() {
  await addColumnIfMissing(
    'drive_items',
    'trashed_at',
    'DATETIME NULL DEFAULT NULL AFTER `is_trashed`'
  );
}

async function patchChatTables() {
  await addColumnIfMissing(
    'chat_messages',
    'mentioned_user_ids',
    "JSON NOT NULL DEFAULT ('[]') AFTER `meeting_id`"
  );

  await addColumnIfMissing(
    'chat_conversation_members',
    'is_pinned',
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_muted`'
  );

  for (const val of ['ONLINE', 'AWAY', 'DO_NOT_DISTURB', 'OFFLINE']) {
    await addEnumValueIfMissing('chat_presence', 'status', val);
  }

  await addColumnIfMissing(
    'chat_conversations',
    'is_meeting_only',
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_archived`'
  );

  await sequelize.query(`
    UPDATE chat_conversations c
    JOIN (
      SELECT conversation_id, COUNT(*) AS active_members
        FROM chat_conversation_members
       WHERE left_at IS NULL
       GROUP BY conversation_id
    ) m ON m.conversation_id = c.id
       SET c.is_meeting_only = 1
     WHERE c.type = 'GROUP'
       AND c.is_meeting_only = 0
       AND m.active_members = 1
       AND EXISTS (
         SELECT 1 FROM chat_meetings cm WHERE cm.conversation_id = c.id
       )
  `);
}

async function patchMeetModule() {
  await addColumnIfMissing(
    'meeting_participants',
    'is_screen_sharing',
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_mic_on`'
  );
}

async function patchCallRecords() {
}

async function patchDocumentsTables() {
  const docCategories = [
    'ID_PROOF', 'PAN', 'RESUME', 'OFFER_LETTER', 'EXPERIENCE_LETTER',
    'EDUCATION_CERTIFICATE', 'BANK_DOCUMENT', 'JOINING_DOCUMENT',
    'CONTRACT', 'CERTIFICATE', 'PAYSLIP', 'POLICY', 'OTHER',
  ];
  for (const val of docCategories) {
    await addEnumValueIfMissing('documents', 'category', val);
  }

  await addColumnIfMissing(
    'documents',
    'uploaded_at',
    'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'
  );
}

async function patchSearchIndexes() {
  await addIndexIfMissing('users', 'idx_users_is_active', ['is_active']);
  await addIndexIfMissing('users', 'idx_users_department', ['department']);
  await addIndexIfMissing('email_messages', 'idx_email_messages_sender_draft_trashed', [
    'sender_id',
    'is_draft',
    'sender_trashed',
  ]);
}

async function patchEmployeeStatusTable() {
  await addIndexIfMissing('employee_statuses', 'idx_employee_statuses_user_id', ['user_id']);
  await addIndexIfMissing('employee_statuses', 'idx_employee_statuses_user_end', ['user_id', 'end_time']);
  await addIndexIfMissing('employee_statuses', 'idx_employee_statuses_cleared_end', ['is_cleared', 'end_time']);

  await addColumnIfMissing(
    'employee_statuses',
    'activation_notified',
    'TINYINT(1) NOT NULL DEFAULT 0 AFTER `expiry_notified`'
  );
}

async function patchPayrollTables() {
  await addColumnIfMissing('payslips', 'payroll_id', 'VARCHAR(36) NULL DEFAULT NULL AFTER `user_id`');
  await addColumnIfMissing(
    'payslips',
    'payslip_number',
    'VARCHAR(60) NULL DEFAULT NULL AFTER `status`'
  );
  await addColumnIfMissing('payslips', 'pdf_path', 'VARCHAR(500) NULL DEFAULT NULL AFTER `payslip_number`');
  await addColumnIfMissing(
    'payslips',
    'payment_reference',
    'VARCHAR(100) NULL DEFAULT NULL AFTER `pdf_path`'
  );
  await addIndexIfMissing('payslips', 'idx_payslips_payroll_id', ['payroll_id']);

  await addColumnIfMissing('leave_types', 'is_paid', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `annual_quota`');
}

async function patchCalendarTables() {
  await addColumnIfMissing(
    'calendar_events',
    'event_type',
    "ENUM('MEETING','INTERVIEW','TRAINING','HOLIDAY','LEAVE','BIRTHDAY','COMPANY_EVENT','PERSONAL','TASK_DEADLINE','ATTENDANCE') NOT NULL DEFAULT 'MEETING' AFTER `is_cancelled`"
  );
  await addColumnIfMissing(
    'calendar_events',
    'status',
    "ENUM('SCHEDULED','CONFIRMED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED' AFTER `event_type`"
  );
  await addColumnIfMissing(
    'calendar_events',
    'visibility',
    "ENUM('PRIVATE','TEAM','ORGANIZATION') NOT NULL DEFAULT 'PRIVATE' AFTER `status`"
  );
  await addColumnIfMissing(
    'calendar_events',
    'created_by',
    'VARCHAR(36) NULL DEFAULT NULL AFTER `visibility`'
  );
  await addColumnIfMissing(
    'calendar_events',
    'updated_by',
    'VARCHAR(36) NULL DEFAULT NULL AFTER `created_by`'
  );
  await addIndexIfMissing('calendar_events', 'idx_calendar_events_event_type', ['event_type']);
  await addIndexIfMissing('calendar_events', 'idx_calendar_events_created_by', ['created_by']);

  const [result] = await sequelize.query(
    'UPDATE calendar_events SET created_by = organizer_id WHERE created_by IS NULL'
  );
  if (result && result.affectedRows) {
    console.log(`[migrate] Backfilled created_by for ${result.affectedRows} calendar_events row(s)`);
  }

  await sequelize.query(
    "UPDATE calendar_events SET status = 'CANCELLED' WHERE is_cancelled = 1 AND status <> 'CANCELLED'"
  );
}

async function patchGroupChatTables() {
  const columns = [
    ['chat_groups', 'created_at', 'DATETIME(3) NOT NULL'],
    ['chat_groups', 'updated_at', 'DATETIME(3) NOT NULL'],
    ['chat_group_members', 'joined_at', 'DATETIME(3) NOT NULL'],
    ['chat_group_members', 'last_read_at', 'DATETIME(3) NULL DEFAULT NULL'],
    ['chat_group_members', 'left_at', 'DATETIME(3) NULL DEFAULT NULL'],
    ['chat_group_messages', 'created_at', 'DATETIME(3) NOT NULL'],
    ['chat_group_messages', 'updated_at', 'DATETIME(3) NOT NULL'],
  ];

  for (const [table, column, definition] of columns) {
    const [rows] = await sequelize.query(
      `SELECT DATETIME_PRECISION AS p
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = :table
          AND COLUMN_NAME  = :column`,
      { replacements: { table, column }, type: sequelize.QueryTypes.SELECT }
    );
    if (!rows) continue;
    if (Number(rows.p) >= 3) continue;

    await sequelize.query(
      `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`
    );
    console.log(`[migrate] Upgraded ${table}.${column} to millisecond precision`);
  }

  await addEnumValueIfMissing('chat_group_members', 'role', 'GROUP_ADMIN');
  const [renamed] = await sequelize.query(
    `UPDATE chat_group_members SET role = 'GROUP_ADMIN' WHERE role = 'ADMIN'`
  );
  if (renamed && renamed.affectedRows) {
    console.log(`[migrate] Renamed ${renamed.affectedRows} group ADMIN role(s) to GROUP_ADMIN`);
  }

  await addColumnIfMissing(
    'chat_group_messages',
    'attachment_mime_type',
    'VARCHAR(150) NULL DEFAULT NULL AFTER `attachment_size`'
  );

  for (const table of ['chat_groups', 'chat_group_members', 'chat_group_messages']) {
    const [row] = await sequelize.query(
      `SELECT CCSA.character_set_name AS charset
         FROM information_schema.TABLES T
         JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
           ON CCSA.collation_name = T.table_collation
        WHERE T.table_schema = DATABASE()
          AND T.table_name = :table`,
      { replacements: { table }, type: sequelize.QueryTypes.SELECT }
    );
    if (!row || row.charset === 'utf8mb4') continue;
    await sequelize.query(
      `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[migrate] Converted ${table} to utf8mb4 (emoji support)`);
  }
}

async function runMigrations() {
  const patches = [
    patchNotifications,
    patchEmailTables,
    patchDriveTables,
    patchChatTables,
    patchDocumentsTables,
    patchMeetModule,
    patchCallRecords,
    patchSearchIndexes,
    patchEmployeeStatusTable,

    patchGroupChatTables,
    patchPayrollTables,
    patchCalendarTables,
  ];

  for (const patch of patches) {
    try {
      await patch();
    } catch (err) {
      console.error(`[migrate] Schema patch error in ${patch.name} (non-fatal):`, err.message);
    }
  }

  console.log('[migrate] Schema patches complete.');
}

module.exports = { runMigrations };