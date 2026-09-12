import type { NextConfig } from 'next';

/**
 * El motor vive en @jurifis/core como TypeScript sin compilar. Next lo transpila
 * en el mismo paso que la aplicacion, y el alias de extension permite que los
 * imports con extension .js del codigo fuente resuelvan a los archivos .ts.
 */
const configuracion: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@jurifis/core'],
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default configuracion;
