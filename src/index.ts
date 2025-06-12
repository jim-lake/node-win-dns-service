import EventEmitter from 'node:events';
const addon = require('../build/Release/node_win_dns_service.node');

export default { advertise, stopAdvertise, browse };

const g_emitter = new EventEmitter();

type Record = {
  name: string;
  port: number;
  type: string;
  data: string;
};
function _callback(
  reason: string,
  status: number,
  service: string,
  records: Record[]
) {
  g_emitter.emit(reason, status, service, records);
}
addon.setup(_callback);

type AdvertiseParams = {
  service: string;
  port: number;
};

class Browser extends EventEmitter {
  _service: string;
  constructor(service: string) {
    super();
    this._service = service;
  }
  start() {
    const err = addon.browse(this._service);
    if (err && typeof err === 'string') {
      throw new Error(err);
    }
    if (err) {
      this.emit('error', err);
    } else {
      g_emitter.on('browse', this._onBrowse);
    }
    return err;
  }
  stop() {
    g_emitter.off('browse', this._onBrowse);
    const err = addon.stopBrowse(this._service);
    if (err && typeof err === 'string') {
      throw new Error(err);
    }
    return err;
  }
  _onBrowse = (status, service, records) => {
    this.emit('serviceUp', records);
  };
}
export function advertise(params: AdvertiseParams, done: (err?: any) => void) {
  const err = addon.register(params.service, params.port);
  if (err && typeof err === 'string') {
    throw new Error(err);
  }
  done(err);
}
export function stopAdvertise(service: string, done: (err?: any) => void) {
  const err = addon.deregister(service);
  if (err && typeof err === 'string') {
    throw new Error(err);
  }
  done(err);
}
export function browse(service: string): Browser {
  return new Browser(service);
}
