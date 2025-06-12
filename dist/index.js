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
    this._onBrowse = (status, service, records) => {
      this.emit('serviceUp', records);
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
//# sourceMappingURL=index.js.map
