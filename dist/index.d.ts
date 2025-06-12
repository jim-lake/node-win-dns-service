import EventEmitter from 'node:events';
export interface Service {
  addresses: string[];
  fullname: string;
  host?: string;
  name: string | undefined;
  port?: number;
  type: string;
}
export declare class Browser extends EventEmitter {
  private _service;
  private _lastEmit;
  constructor(service: string);
  start(): void;
  stop(): void;
  private _onBrowse;
  private _maybeEmit;
}
export declare class Advertiser extends EventEmitter {
  private _service;
  private _port;
  constructor(service: string, port: number);
  start(): void;
  stop(): void;
  private _onRegister;
  private _onDeregister;
}
declare const _default: {
  Advertiser: typeof Advertiser;
  Browser: typeof Browser;
};
export default _default;
