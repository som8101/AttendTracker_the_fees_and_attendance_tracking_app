const { spawn } = require('child_process');

const child = spawn('npx.cmd', ['eas-cli', 'build', '-p', 'android', '--profile', 'preview'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  cwd: __dirname
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  if (output.includes('Generate a new Android Keystore?')) {
    console.log('--- AUTO-ANSWERING Y ---');
    child.stdin.write('y\n');
  }
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});
