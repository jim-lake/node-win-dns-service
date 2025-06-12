import EventEmitter from 'node:events';
declare const _default: {
  advertise: typeof advertise;
  stopAdvertise: typeof stopAdvertise;
  browse: typeof browse;
};
export default _default;
interface Service {
  addresses: string[];
  fullname: string;
  host?: string;
  name: string | undefined;
  port?: number;
  type: string;
}
type AdvertiseParams = {
  service: string;
  port: number;
};
type LastEmit = {
  reason: string;
  time: number;
  service: Service;
};
declare class Browser extends EventEmitter {
  _service: string;
  _lastEmit: Map<string, LastEmit>;
  constructor(service: string);
  start(): any;
  stop(): any;
  _onBrowse: (status: any, service: any, records: any) => void;
  _maybeEmit(reason: string, service: Service): void;
}
export declare function advertise(
  params: AdvertiseParams,
  done: (err?: any) => void
): void;
export declare function stopAdvertise(
  service: string,
  done: (err?: any) => void
): void;
export declare function browse(service: string): Browser;
