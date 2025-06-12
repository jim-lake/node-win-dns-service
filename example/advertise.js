const DnsService = require('../dist/index.js');

const service = process.argv[2];
const port = parseInt(process.argv[3]);

if (!service || !port || isNaN(port) ) {
  console.log('Usage: advertise <service> <port>');
  process.exit(-1);
}
console.log('advertise:', service, port);

try {
  DnsService.advertise({ service, port }, (err, result) => {
    if (err) {
      console.error('failed:', err);
    } else {
      console.log('success:', result);
    }
  });
} catch (e) {
  console.error('threw:', e);
}
