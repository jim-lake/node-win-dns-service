const DnsService = require('../dist/index.js');

const service = process.argv[2];

if (!service) {
  console.log('Usage: browse <service>');
  process.exit(-1);
}
console.log('browse:', service);

try {
  const browser = DnsService.browse(service);

  browser.on('error', (err) => {
    console.error('error:', error);
  });
  browser.on('serviceUp', (service) => {
    console.error('serviceUp:', service);
  });
  browser.on('serviceDown', (service) => {
    console.error('serviceDown:', service);
  });
} catch (e) {
  console.error('threw:', e);
}
