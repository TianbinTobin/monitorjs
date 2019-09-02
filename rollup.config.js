import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: './index.js',
    output: {
      name: 'Monitor',
      file: './dist/monitor.js',
      format: 'umd',
    },
    plugins: [resolve(), commonjs()],
  },
  {
    input: './index.js',
    output: {
      name: 'Monitor',
      file: './dist/monitor.min.js',
      format: 'umd',
    },
    plugins: [
      resolve(),
      commonjs(),
      terser({
        compress: {
          drop_console: true,
        },
      }),
    ],
  },
];
