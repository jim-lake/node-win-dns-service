const DnsService = require('../dist/index.js');

const service = process.argv[2];
const port = parseInt(process.argv[3]);

if (!service || !port || isNaN(port)) {
  console.log('Usage: advertise <service> <port>');
  process.exit(-1);
}
console.log('advertise:', service, port);

let advertiser;
try {
  advertiser = new DnsService.Advertiser(service, port);
  advertiser.on('error', (error) => {
    console.error('error:', error);
  });
  advertiser.start();
} catch (e) {
  console.error('start threw:', e);
  process.exit(-3);
}

console.log('Any key to stop...');
process.stdin.setRawMode(true);
process.stdin.once('data', () => {
  process.stdin.setRawMode(false);
  try {
    console.log('stop:', service);
    advertiser.stop();
    console.log('stop success');
    setTimeout(() => {}, 60 * 60 * 1000);
    console.log('waiting forever...');
  } catch (e) {
    console.error('stop threw:', e);
    process.exit(-3);
  }
});
