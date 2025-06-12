import EventEmitter from 'node:events';
declare const _default: {
  advertise: typeof advertise;
  stopAdvertise: typeof stopAdvertise;
  browse: typeof browse;
};
export default _default;
type AdvertiseParams = {
  service: string;
  port: number;
};
declare class Browser extends EventEmitter {
  _service: string;
  constructor(service: string);
  start(): any;
  stop(): any;
  _onBrowse: (status: any, service: any, records: any) => void;
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
