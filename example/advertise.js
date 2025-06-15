const DnsService = require('../dist/index.js');

const service = process.argv[2];
const port = parseInt(process.argv[3]);
const kv_list = process.argv[4];

if (!service || !port || isNaN(port)) {
  console.log('Usage: advertise <service> <port> [key=value list]');
  process.exit(-1);
}

let properties = undefined;
if (kv_list) {
  properties = {};
  kv_list.split(',').forEach((kv) => {
    const kv_split = kv.split('=');
    properties[kv_split[0]] = kv_split[1];
  });
}

console.log('advertise:', service, port, properties);

let advertiser;
try {
  advertiser = new DnsService.Advertiser(service, port, properties);
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
