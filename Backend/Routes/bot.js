//ベーシックID:@407mhlwc
const express = require("express");
const router = express.Router();
const line = require("@line/bot-sdk");
require("dotenv").config();
const getText = require('../Tools/getText');
const getImage = require('../Tools/getImage');
const DBPerf = require('../Tools/DBPerf');
const fs = require('fs');
let result;

//認証情報設定
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);
let eventList = [];
let i = 0;

async function divideMessage(client, text, event) {
    let content = [];
    const maxLen = 1500;
    let start = 0;

    while (start < text.length) {
        content.push(text.substring(start, start + maxLen));
        start += maxLen;
    }

    for (let i = 0; i < content.length; i++) {
        try {
            await client.pushMessage(event.source.userId, [
                { type: "text", text: content[i] }
            ]);
        } catch (err) {
            console.error('メッセージ分割失敗');
        }
    }
    return content;
}


router.post("/", async (req, res) => {
    const events = req.body.events; //メッセージ
    let content = "📨メッセージを受け取りました";
    let event;

    if (!events) return res.status(200).send("ok");
    for (event of events) {

        if (event.type !== "message") continue;

        if (event.message.type == "text") {
            //一覧表示
            if (event.message.text.match('一覧')) {
                result = await DBPerf('一覧', 'SELECT title, dateTime, reminderTime FROM events WHERE userId = ?;', event.source.userId);
                if (result.length === 0) {
                    content = "予定がありません";
                    await client.replyMessage(event.replyToken, { type: "text", text: content });
                } else {
                    content = result.map(item => {
                        if (item.reminderTime == null) {
                            return `🗓️${item.dateTime}\n📌${item.title}`;
                        } else {
                            return `🗓️${item.dateTime}\n📌${item.title}\n🔔${item.reminderTime}`;
                        }
                    }).join("\n\n");
                    await divideMessage(client, content, event);
                    continue;
                }
            }

            //予定変更
            if (event.message.text.match('変更')) {
                let beforeTemp = event.message.text.replace(/(予定)*変更\s*/, "");
                let afterTemp = event.message.text.replace(/^(予定)*変更\s*\n/, "");
                afterTemp = afterTemp.replace(/^[^\n]*\n/, "");
                afterTemp = afterTemp.trim();
                let beforeName = beforeTemp.replace(/\n[\s\S]*$/, "");
                console.log('afterTemp\n', afterTemp);

                let changeResult = await DBPerf('予定削除', 'DELETE FROM events WHERE userId = ? AND title = ?', [event.source.userId, beforeName]);
                if (changeResult.changes > 0) {
                    content = await getText(event, afterTemp, client);
                    content = '✏️予定を変更しました✏️\n' + content;
                } else {
                    content = '⚠️予定が見つかりませんでした';
                }

            //削除
            } else if (event.message.text.match('削除')) {
                let resultCount;
                if (event.message.text.match('削除\n予定')) {
                    let deleteName = event.message.text.replace(/^削除\s*予定名?[：:]?\s*/, "");
                    resultCount = await DBPerf('削除', 'DELETE FROM events WHERE userId = ? AND title = ?', [event.source.userId, deleteName]);
                    deleteName = deleteName.trim();
                    if (resultCount.changes > 0) {
                        content = "🗑️予定名：" + deleteName + "を削除しました";
                    } else {
                        content = "❌予定名：" + deleteName + "がありません";
                    }
                } else {
                    resultCount = await DBPerf('削除', 'DELETE FROM events WHERE userId=?', event.source.userId);
                    if (resultCount.changes > 0) {
                        content = '🗑️すべての予定を削除しました'
                    } else {
                        content = "❌予定がありません";
                    }
                }

            //予定追加（テキスト）
            } else if (event.message.text.match('日付')) {
                const messageText = event.message.text;
                console.log("text:", event.message.text, "\n");
                content = await getText(event, messageText, client);
                content = '📢予定を追加しました📢\n' + content;

            //検索
            } else if (event.message.text.match('検索')) {
                let searchName = event.message.text.replace(/(予定)*検索\s*/, "");
                let searchResult = await DBPerf('検索', 'SELECT title, dateTime, reminderTime FROM events WHERE userId=? AND title=?', [event.source.userId, searchName]);
                if (searchResult.length === 0) {
                    content = '🔍予定が見つかりませんでした';
                } else {
                    content = '🔍検索結果🔍\n';
                    for (const e of searchResult) {
                        content += `🗓️${e.dateTime}\n` + `\n📌${e.title}\n` + `🔔${e.reminderTime ?? 'なし'}\n`;
                    }
                }
            }


            try {
                //非同期関数
                await client.replyMessage(event.replyToken, [
                    { type: "text", text: content }
                ]);
            } catch (err) {
                console.error("Reply failed:", err);
            }

        } else if (event.message.type == "image" || event.message.type == "file") {
            console.log('image or file\n', event);

            //予定追加（画像・ファイル）
            try {
                await client.replyMessage(event.replyToken, {
                    type: "text",
                    text: "📄画像を処理中です"
                });
            } catch (err) {
                console.error("Reply failed:", err);
            }

            content = await getImage(event, client);
            if(content.match("エラー")){
                content = "⚠️画像から予定を取得できませんでした⚠️";
            }else{
                content = "📢予定を追加しました📢\n" + content;
            }
            eventList = content.split('\n\n');
            divideMessage(client, content, event);
            console.log(eventList);
        }
    }
    console.log(eventList);
    res.status(200).send("ok");
});

module.exports = router;
