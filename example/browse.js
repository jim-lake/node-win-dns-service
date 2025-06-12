const DnsService = require('../dist/index.js');
const util = require('node:util');

const service = process.argv[2];

if (!service) {
  console.log('Usage: browse <service>');
  process.exit(-1);
}
console.log('browse:', service);

try {
  const browser = DnsService.browse(service);

  browser.on('error', (err) => {
    console.error('error:', util.inspect(err, { depth: 99 }));
  });
  browser.on('serviceUp', (service) => {
    console.log('serviceUp:', util.inspect(service, { depth: 99 }));
  });
  browser.on('serviceDown', (service) => {
    console.log('serviceDown:', util.inspect(service, { depth: 99 }));
  });
  const ret = browser.start();
  console.log('start: ret:', ret);
  if (!ret) {
    setTimeout(() => {
      const ret = browser.stop();
      console.log('stop: ret:', ret);
      setTimeout(() => {}, 60 * 60 * 1000);
      console.log('waiting forever...');
    }, 60 * 1000);
    console.log('waiting 60 seconds...');
  }
} catch (e) {
  console.error('threw:', e);
}
