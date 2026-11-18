// Heavy optional integrations load only on their first diagnostics/provider operation.
function createLazyDesktopDependencies(load = require) {
  let zipConstructor;
  const getZipConstructor = () => (zipConstructor ??= load('jszip'));
  const JSZip = new Proxy(function () {}, {
    construct(_target, args) {
      return new (getZipConstructor())(...args);
    },
    get(_target, property) {
      const constructor = getZipConstructor();
      const value = constructor[property];
      return typeof value === 'function' ? value.bind(constructor) : value;
    },
  });

  let auth;
  const getAuth = () => {
    if (!auth) {
      const { GoogleAuth } = load('google-auth-library');
      auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    }
    return auth;
  };
  const vertexAuth = new Proxy(
    {},
    {
      get(_target, property) {
        const instance = getAuth();
        const value = instance[property];
        return typeof value === 'function' ? value.bind(instance) : value;
      },
    },
  );
  return { JSZip, vertexAuth };
}

module.exports = { createLazyDesktopDependencies };
