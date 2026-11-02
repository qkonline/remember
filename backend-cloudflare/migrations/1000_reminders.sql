-- Remember's daily reminder (src/app/reminders.ts). Both tables are copies of what people's devices
-- sync (src/app/sync.ts afterApply), kept so a background job can tell whether anything is due
-- without opening anyone's sync space. Rebuildable: a device's next change refreshes them.

-- Each active topic's next check-in day.
CREATE TABLE remember_due (
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  due TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, topic_id)
);
CREATE INDEX remember_due_by_user ON remember_due (user_id, active, due);

-- When each person wants the reminder (HH:MM in their time zone), or NULL for none.
CREATE TABLE remember_reminders (
  user_id TEXT PRIMARY KEY,
  at TEXT,
  tz TEXT NOT NULL DEFAULT 'UTC',
  updated INTEGER NOT NULL
);
