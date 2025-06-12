import EventEmitter from 'node:events';
const addon = require('../build/Release/node_win_dns_service.node');

export default { advertise, stopAdvertise, browse };

const SKIP_TIME = 60 * 1000;
const g_emitter = new EventEmitter();

interface Service {
  addresses: string[];
  fullname: string;
  host?: string;
  name: string | undefined;
  port?: number;
  type: string;
}

type Record = {
  name: string;
  type: string;
  ttl: number;
  port: number;
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

type LastEmit = {
  reason: string;
  time: number;
  service: Service;
};
class Browser extends EventEmitter {
  _service: string;
  _lastEmit = new Map<string, LastEmit>();
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
    const addresses: string[] = [];
    let is_down = false;
    let fullname: string;
    let host: string;
    let type: string;
    let port: number;
    const errors = [];

    records.forEach((record) => {
      if (record.type === 'PTR' && record.ttl === 0 && record.data) {
        is_down = true;
        type = record.name;
        fullname = _addDot(record.data);
      } else if (record.ttl === 0) {
        errors.push({ error: 'zero_ttl', record });
      } else if (record.type === 'PTR') {
        type = record.name;
        fullname = _addDot(record.data);
      } else if (record.type === 'SRV') {
        port = record.port;
        host = _addDot(record.data);
        fullname = _addDot(record.name);
      } else if (record.type === 'A' || record.type === 'AAAA') {
        addresses.push(record.data);
      } else {
        console.log('ignored:', record);
      }
    });

    if (is_down) {
      const name = _nameFromFullname(fullname);
      const service = { fullname, type, name, addresses };
      this._maybeEmit('serviceDown', service);
    } else if (port && fullname && addresses.length > 0) {
      const name = _nameFromFullname(fullname);
      if (!type) {
        type = _typeFromFullname(fullname);
      }
      const service = { fullname, type, name, host, addresses };
      this._maybeEmit('serviceUp', service);
    } else {
      errors.push({ error: 'no_up_or_down', records });
    }

    if (errors.length > 0) {
      this.emit('error', errors);
    }
  };
  _maybeEmit(reason: string, service: Service) {
    const last = this._lastEmit.get(service.fullname);
    const delta = Date.now() - (last?.time ?? 0);
    let should_emit = true;
    if (
      last &&
      delta < SKIP_TIME &&
      last.reason === reason &&
      _isServiceEqual(service, last.service)
    ) {
      should_emit = false;
    }
    if (should_emit) {
      const time = Date.now();
      this._lastEmit.set(service.fullname, { reason, time, service });
      this.emit(reason, service);
    }
  }
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
function _addDot(s: string): string {
  if (!s.endsWith('.')) {
    s += '.';
  }
  return s;
}
function _isServiceEqual(a, b) {
  return (
    a.fullname === b.fullname &&
    a.name === b.name &&
    a.host === b.host &&
    a.type === b.type &&
    a.port === b.port &&
    _isAddressesEqual(a.addresses, b.addresses)
  );
}
function _isAddressesEqual(a, b) {
  let ret = a.length === b.length;
  if (ret) {
    ret = a.every((ip) => b.includes(ip));
  }
  return ret;
}
function _typeFromFullname(fullname: string): string {
  return fullname.split('.').slice(-4, -1).join('.');
}
function _nameFromFullname(fullname: string): string {
  return fullname.split('.').slice(0, -4).join('.');
}
