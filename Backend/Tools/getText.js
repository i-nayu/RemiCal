const DBPerf = require('../Tools/DBPerf');
const calenderURL = require('../Tools/calenderURL');
const dayjs = require('dayjs');

async function getText(event, messageText, client) {
    let content = "📢予定を追加しました📢\n";
    let year; //今年
    let month;
    let date;
    let eventName = "未定";
    let dateTime
    let reminder = 0;
    let remindTime;
    messageText = messageText.trim();
    let message = messageText.split('\n'); //改行で区切る
    console.log('getText', message);

    /*日付取り出し*/
    const now = new Date();
    if (messageText.indexOf("日付") == -1) {
        console.log('日付を認識できませんでした');
        return "日付を認識できませんでした";
    }

    year = message[0].match(/\d{4}/g);
    message[0] = message[0].replace(/\d{4}/g, "");
    if (!year) {
        year = now.getFullYear();
    }
    const dateList = message[0].match(/\d{1,2}/g); //日付だけ取り出す
    let count = 0;
    if (message[0].match(/\d{1,2}/g) != null) {
        count = message[0].match(/\d{1,2}/g).length;
    }

    if (count >= 2) {
        month = dateList[0];
        date = dateList[1];
        content = content + '🗓️日付:' + year + '年' + month + '月' + date + '日';
        dateTime = year + '-' + month + '-' + date;
        console.log("年：", year);
        console.log("日付：", dateList); //年・月・日が配列になっている
    } else if (count == 1) {
        console.log('月と日付は両方入力してください');
        return "月と日付は両方入力してください";
    }

    /*予定取り出し*/
    if (message[1].indexOf("予定") != -1) {
        eventName = message[1].replace(/^予定名?[：:]?\s*/, "");
    } else {
        content = content + '\n📌予定名:未定';
    }
    content = content + '\n📌予定名: ' + eventName;
    console.log('予定', eventName);

    //リマインド設定
    if (messageText.includes("リマインド")) {
        remindTime = message[2].replace(/[^0-9]/g, '');

        const remindBase = new Date(year, month - 1, date);
        remindBase.setDate(remindBase.getDate() - remindTime);
        reminder = dayjs(`${year}-${month}-${date}`).subtract(remindTime, 'day').format('YYYY-MM-DD');
        content = content + '\n🔔リマインド：' + reminder;
    }


    await DBPerf('予定追加', 'INSERT INTO events (userId, title, dateTime, reminderTime) VALUES (?, ?, ?, ?)', [event.source.userId, eventName, dateTime, reminder]);
    const buttonMessage = calenderURL(eventName, dateTime);
    await client.replyMessage(event.replyToken, [
        { type: "text", text: content },
        buttonMessage
    ]);


    return content;

}
module.exports = getText;
