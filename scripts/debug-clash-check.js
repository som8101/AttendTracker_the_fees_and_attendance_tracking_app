const { parse } = require('date-fns');

function parseTime(timeStr) {
  const date = parse(timeStr, 'h:mm a', new Date());
  return date.getHours() * 60 + date.getMinutes();
}

const existStart = parseTime("7:00 AM");
const existEnd = parseTime("10:00 AM");

const newStart = parseTime("7:00 PM");
const newEnd = parseTime("8:30 PM");

console.log({
  existStart,
  existEnd,
  newStart,
  newEnd,
  clash: newStart < existEnd && newEnd > existStart
});

const newStartWed = parseTime("8:30 AM");
const newEndWed = parseTime("10:00 AM");

console.log({
  newStartWed,
  newEndWed,
  clashWed: newStartWed < existEnd && newEndWed > existStart
});
