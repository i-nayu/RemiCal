const calenderButton = require('../DB/calenderButton');

function calenderURL (title, dateTime){
    const time = dateTime.replace(/-/g, '');
    const url = `https://www.google.com/calendar/render?action=TEMPLATE` 
    +`&text=${encodeURIComponent(title)}` + `&dates=${time}/${time}`;

    const button = JSON.parse(JSON.stringify(calenderButton));
    button.template.actions[0].uri = url;

    return button;
}
module.exports = calenderURL;