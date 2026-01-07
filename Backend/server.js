// 1. require
const express = require('express');
const router = express.Router();
const app = express();
const RemicalRouter = require("./Routes/bot.js");
const line = require("@line/bot-sdk");
const cron = require('node-cron');
const DBPerf = require('./Tools/DBPerf');
const sendReminder = require('./Tools/sendReminder');

// 2. use
app.use(express.json());
app.use("/bot", RemicalRouter);

//3. routing
app.get("/", (req, res) => {
    res.send("test");
});

//認証情報設定
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// 毎日 9:00 にリマインド送信（Node.js cron モジュールを利用）
cron.schedule('47 11 * * *', async () => {
    // すべてのユーザーのリマインドを取得して送信
    try {
        const users = await DBPerf('ユーザー一覧', 'SELECT DISTINCT userId FROM events', []);
        for (const u of users) {
            await sendReminder(u.userId, client);
        }
        console.log('cron完了');
    }catch(e){
        console.log('cronerror',e);
    }
});

// 4. listen
app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
    console.log(`http://localhost:${process.env.PORT}`);
});