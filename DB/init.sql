CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,       -- LINEのuserId
    title TEXT NOT NULL,        -- 予定内容
    dateTime DATE NOT NULL, -- 予定日時
    notified BOOLEAN DEFAULT 0,  -- リマインド済みかどうか
    reminderTime DATE --リマインド日時（リマインドしなければnull)
);