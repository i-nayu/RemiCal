const DBPerf = require('../Tools/DBPerf');
const genaiModule = require("@google/generative-ai");
const { GoogleGenerativeAI } = genaiModule;
const fs = require('fs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getImage(event, client) {
    let response = "";
    let addedEvents = [];
    let events = [];
    try {
        const messageId = event.message.id;
        let responseText;

        // ① LINE画像バイナリ取得
        const stream = await client.getMessageContent(messageId);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        // ② base64に変換
        const base64Image = buffer.toString("base64");

        // ③ MIMEタイプ設定
        let mimeType = "image/jpeg"; // デフォルト
        if (event.message.type === "file" && event.message.fileName) {
            // ファイルの場合のみ拡張子で判断
            const ext = event.message.fileName.split('.').pop().toLowerCase();
            switch (ext) {
                case 'webp':
                    mimeType = "image/webp";
                    break;
                case 'png':
                    mimeType = "image/png";
                    break;
                case 'jpg':
                case 'jpeg':
                    mimeType = "image/jpeg";
                    break;
                default:
                    mimeType = "application/octet-stream";
            }
        } else if (event.message.type === "image") {
            // 画像の場合は LINE が送る MIME を使う
            mimeType = event.message.contentProvider?.type === "line" ? "image/jpeg" : "image/jpeg";
        }

        // ③ Geminiへ送信
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        { inlineData: { data: base64Image, mimeType } },
                        {
                            text: `画像内の文字から予定を抽出してください。結果は必ず次のJSON配列形式で出力してください。

                            [
                                {
                                    "date": "YYYY-MM-DD",
                                    "title": "予定名"
                                }
                            ]

                            見つからない場合は[] を返してください。推測はしてもよいですが、日付が曖昧な場合は null にしてください。
                            出力は必ず JSON のみを返してください。
                            ` }
                    ]
                }
            ]
        });

        responseText = result.response.text().trim();
        responseText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        try {
            events = JSON.parse(responseText);
        } catch (e) {
            console.error("JSON parse failed:", responseText);
            events = [];
        }

        for (const e of events) {
            if (!e.date) continue;

            await DBPerf('予定追加',
                'INSERT INTO events (userId, title, dateTime) VALUES (?, ?, ?)',
                [event.source.userId, e.title, e.date]);
            addedEvents.push(`🗓️日付: ${e.date.replace(/-/g, '/')}\n📌予定名: ${e.title}`);
        }

        if (addedEvents.length > 0) {
            response = addedEvents.join("\n\n");
        } else {
            response = "⚠️画像から予定を取得できませんでした⚠️";
        }

        console.log('responseText\n' + responseText);
        console.log('\n\nresponse\n\n' + response);


    } catch (err) {
        console.error("画像解析エラー:", err);
        response = "画像解析中にエラーが発生しました。";
    }

    if (!response) response = "⚠️画像から予定を取得できませんでした⚠️";
    return response;
}

module.exports = getImage;