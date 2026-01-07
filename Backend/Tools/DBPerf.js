const Database = require('better-sqlite3');
const db = new Database('./eventList.db'); 
let result;

async function DBPerf(label, query, elements) { //SQLクエリを投げて結果を取得するパフォーマンス確認用関数
    console.log(`\nDBPerf-Function is running!\n`);
    console.log(`[DBPerf] Input => [ ${label}, ${query}, ${elements} ]`);
    const start = Date.now();

    if(query.indexOf("SELECT") == -1){
        result = db.prepare(query).run(elements);
    }else{
        result = db.prepare(query).all(elements);
    }
    const end = Date.now();
    console.log(`[DBPerf] ${label} is executed!: ${end - start} ms`);
    console.log(`[DBPerf] Output => [ ${result} ]`);
    console.log(`[DBPerf] Shutdown!`);
    return result;
}

module.exports = DBPerf;