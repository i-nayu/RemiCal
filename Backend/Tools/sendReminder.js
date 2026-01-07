const DBPerf = require('./DBPerf');

async function sendReminder(userId, client){
    const today = new Date().toISOString().split("T")[0]; 
    const reminderList = await DBPerf('リマインダー取得',
        'SELECT title, userId, reminderTime, dateTime, id FROM events WHERE userId = ? AND reminderTime = ? AND notified = ?',
        [userId, today, 0]);

    for(const remind of reminderList){
        await client.pushMessage(remind.userId, [
        { type: 'text', text: `🔔リマインド🔔\n 🗓️日付:${remind.reminderTime} \n📌予定名：${remind.title} ` }
    ]);

    await DBPerf('リマインダー済み','UPDATE events SET notified = 1 WHERE id = ?',[remind.id]);
    }

}

module.exports = sendReminder;