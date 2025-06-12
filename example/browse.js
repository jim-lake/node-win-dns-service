const DnsService = require('../dist/index.js');
const util = require('node:util');

const service = process.argv[2];

if (!service) {
  console.log('Usage: browse <service>');
  process.exit(-1);
}
console.log('browse:', service);

let browser;
try {
  browser = new DnsService.Browser(service);
  browser.on('error', (err) => {
    console.error('error:', util.inspect(err, { depth: 99 }));
  });
  browser.on('extras', (extras) => {
    console.log('extras:', util.inspect(extras, { depth: 99 }));
  });
  browser.on('serviceUp', (service) => {
    console.log('serviceUp:', util.inspect(service, { depth: 99 }));
  });
  browser.on('serviceDown', (service) => {
    console.log('serviceDown:', util.inspect(service, { depth: 99 }));
  });
  browser.start();
} catch (e) {
  console.error('start threw:', e);
}
console.log('Any key to stop...');
process.stdin.setRawMode(true);
process.stdin.once('data', () => {
  process.stdin.setRawMode(false);
  try {
    browser.stop();
    setTimeout(() => {}, 60 * 60 * 1000);
    console.log('waiting forever...');
  } catch (e) {
    console.error('stop threw:', e);
    process.exit(-3);
  }
});
