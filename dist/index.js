'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.Advertiser = exports.Browser = void 0;
const node_events_1 = __importDefault(require('node:events'));
const addon = require('../build/Release/node_win_dns_service.node');
const SKIP_TIME = 60 * 1000;
const g_emitter = new node_events_1.default();
function _callback(reason, status, service, records) {
  g_emitter.emit(reason, status, service, records);
}
addon.setup(_callback);
class Browser extends node_events_1.default {
  constructor(service) {
    super();
    this._lastEmit = new Map();
    this._onBrowse = (status, service, records) => {
      const addresses = [];
      let is_down = false;
      let fullname;
      let host;
      let type;
      let port;
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
  _maybeEmit(reason, service) {
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
exports.Browser = Browser;
class Advertiser extends node_events_1.default {
  constructor(service, port) {
    super();
    this._onRegister = (status, service) => {
      if (service === this._service && status !== 0) {
        this.emit('error', status);
      }
    };
    this._onDeregister = (status, service) => {
      if (service === this._service && status !== 0) {
        this.emit('error', status);
      }
    };
    this._service = service;
    this._port = port;
  }
  start() {
    g_emitter.off('deregister', this._onDeregister);
    g_emitter.on('register', this._onRegister);
    const err = addon.register(this._service, this._port);
    if (err && typeof err === 'string') {
      throw new Error(err);
    }
    return err;
  }
  stop() {
    g_emitter.off('register', this._onRegister);
    g_emitter.on('deregister', this._onDeregister);
    const err = addon.deregister(this._service);
    if (err && typeof err === 'string') {
      throw new Error(err);
    }
    return err;
  }
}
exports.Advertiser = Advertiser;
function _addDot(s) {
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
function _typeFromFullname(fullname) {
  return fullname.split('.').slice(-4, -1).join('.');
}
function _nameFromFullname(fullname) {
  return fullname.split('.').slice(0, -4).join('.');
}
exports.default = { Advertiser, Browser };
//# sourceMappingURL=index.js.map
