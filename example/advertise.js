const DnsService = require('../dist/index.js');

const service = process.argv[2];
const port = parseInt(process.argv[3]);

if (!service || !port || isNaN(port)) {
  console.log('Usage: advertise <service> <port>');
  process.exit(-1);
}
console.log('advertise:', service, port);

try {
  DnsService.advertise({ service, port }, (err, result) => {
    if (err) {
      console.error('failed:', err);
      process.exit(-1);
    } else {
      console.log('advertise success!');
    }
  });
} catch (e) {
  console.error('threw:', e);
  process.exit(-2);
}

console.log('Waiting 30 seconds...');
setTimeout(() => {
  try {
    console.log('stopAdvertise:', service);
    DnsService.stopAdvertise(service, (err) => {
      if (err) {
        console.error('stop failed:', err);
        process.exit(-4);
      } else {
        console.log('stop success');
      }
      setTimeout(
        () => {
          console.log('waiting forever...');
        },
        60 * 60 * 1000
      );
    });
  } catch (e) {
    console.error('threw:', e);
    process.exit(-3);
  }
}, 30 * 1000);
