'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.advertise = advertise;
exports.stopAdvertise = stopAdvertise;
exports.browse = browse;
const node_events_1 = __importDefault(require('node:events'));
const addon = require('../build/Release/node_win_dns_service.node');
exports.default = { advertise, stopAdvertise, browse };
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
    let should_emit = true;
    if (last && last[0] === reason && _isServiceEqual(service, last[1])) {
      should_emit = false;
    }
    if (should_emit) {
      this._lastEmit.set(service.fullname, [reason, service]);
      this.emit(reason, service);
    }
  }
}
function advertise(params, done) {
  const err = addon.register(params.service, params.port);
  if (err && typeof err === 'string') {
    throw new Error(err);
  }
  done(err);
}
function stopAdvertise(service, done) {
  const err = addon.deregister(service);
  if (err && typeof err === 'string') {
    throw new Error(err);
  }
  done(err);
}
function browse(service) {
  return new Browser(service);
}
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
//# sourceMappingURL=index.js.map
