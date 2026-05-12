const os = require('os');
const path = require('path');

const dbPath = path.join(os.homedir(), '.expo', 'sqlite', 'teachytech.db'); // Note: Expo SQLite usually stores db in different places on emulator. But wait, on Windows running Expo? Actually Expo uses the SQLite library, but in development, it's stored on the device/emulator. 
console.log(dbPath);
