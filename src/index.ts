import EventEmitter from 'node:events';
const addon = require('../build/Release/node_win_dns_service.node');

const SKIP_TIME = 60 * 1000;
const g_emitter = new EventEmitter();

export interface Service {
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

type LastEmit = {
  reason: string;
  time: number;
  service: Service;
};
export class Browser extends EventEmitter {
  private _service: string;
  private _lastEmit = new Map<string, LastEmit>();
  constructor(service: string) {
    super();
    this._service = service;
  }
  start() {
    g_emitter.on('browse', this._onBrowse);
    try {
      addon.browse(this._service);
    } catch (e) {
      this.emit('error', e);
    }
  }
  stop() {
    g_emitter.off('browse', this._onBrowse);
    try {
      addon.stopBrowse(this._service);
    } catch (e) {
      this.emit('error', e);
    }
  }
  private _onBrowse = (status, service, records) => {
    const addresses: string[] = [];
    let is_down = false;
    let fullname: string;
    let host: string;
    let type: string;
    let port: number;
    const extras = [];

    records.forEach((record) => {
      if (record.type === 'PTR' && record.ttl === 0 && record.data) {
        is_down = true;
        type = record.name;
        fullname = _addDot(record.data);
      } else if (record.type === 'SRV' && record.ttl === 0) {
        is_down = true;
        fullname = _addDot(record.name);
      } else if (record.ttl === 0) {
        extras.push({ reason: 'zero_ttl', record });
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
        extras.push({ reason: 'ignored', record });
      }
    });

    if (!type && fullname) {
      type = _typeFromFullname(fullname);
    }
    if (is_down) {
      const name = _nameFromFullname(fullname);
      const service = { fullname, type, name, addresses };
      this._maybeEmit('serviceDown', service);
    } else if (port && fullname && addresses.length > 0) {
      const name = _nameFromFullname(fullname);
      const service = { fullname, type, name, host, port, addresses };
      this._maybeEmit('serviceUp', service);
    } else {
      extras.push({ reason: 'no_up_or_down', records });
    }

    if (extras.length > 0) {
      this.emit('extras', extras);
    }
  };
  private _maybeEmit(reason: string, service: Service) {
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
export class Advertiser extends EventEmitter {
  private _service: string;
  private _port: number;
  constructor(service: string, port: number) {
    super();
    this._service = service;
    this._port = port;
  }
  start() {
    g_emitter.off('deregister', this._onDeregister);
    g_emitter.on('register', this._onRegister);
    try {
      addon.register(this._service, this._port);
    } catch (e) {
      this.emit('error', e);
    }
  }
  stop() {
    g_emitter.off('register', this._onRegister);
    g_emitter.on('deregister', this._onDeregister);
    try {
      addon.deregister(this._service);
    } catch (e) {
      this.emit('error', e);
    }
  }
  private _onRegister = (status: number, service: string) => {
    if (service === this._service && status !== 0) {
      this.emit('error', status);
    }
  };
  private _onDeregister = (status: number, service: string) => {
    if (service === this._service && status !== 0) {
      this.emit('error', status);
    }
  };
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
export default { Advertiser, Browser };
