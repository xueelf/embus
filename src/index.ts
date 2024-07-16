export interface RequestConfig extends RequestInit {
  method: Method;
  url: string;
  origin?: string;
}

type Method = 'GET' | 'DELETE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH';

class Embus {
  constructor() {}

  async request(config: RequestConfig) {}
  async get() {}
  async delete() {}
  async head() {}
  async post() {}
  async put() {}
  async patch() {}
}

interface EmbusInstance extends Embus {
  (...args: Parameters<Embus['request']>): ReturnType<Embus['request']>;
}

function createInstance(): EmbusInstance {
  const context = new Embus();
  const instance = context.request.bind<EmbusInstance>(context);
  const keys = <Array<keyof Embus>>Object.getOwnPropertyNames(Embus.prototype);

  for (const key of keys) {
    instance[key] = context[key].bind(context);
  }
  return instance;
}

export default createInstance();
