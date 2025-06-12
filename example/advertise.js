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
  const err = advertiser.start();
  if (err) {
    console.log('start err:', err);
    process.exit(-2);
  }
} catch (e) {
  console.error('threw:', e);
  process.exit(-3);
}

console.log('Any key to stop...');
process.stdin.setRawMode(true);
process.stdin.once('data', () => {
  process.stdin.setRawMode(false);
  try {
    console.log('stop:', service);
    const err = advertiser.stop();
    if (err) {
      console.error('stop failed:', err);
      process.exit(-4);
    } else {
      console.log('stop success');
    }
    setTimeout(() => {}, 60 * 60 * 1000);
    console.log('waiting forever...');
  } catch (e) {
    console.error('threw:', e);
    process.exit(-3);
  }
});
