// 本地开发入口：环境变量在 Node 里注入，避免 `NODE_ENV=development tsx watch` 这类
// POSIX 写法在 Windows 的 cmd（npm 执行脚本用的就是它）下报「不是内部或外部命令」。
// 用法：根目录 `npm run dev`，或 `npm --workspace server run dev`。
import { spawn } from 'node:child_process'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const tsxPackage = require.resolve('tsx/package.json')
const pkg = require(tsxPackage)
const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.tsx

if (!bin) throw new Error('找不到 tsx 的命令入口，请重新执行 npm install')

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: process.env.PORT ?? '8788'
}

const child = spawn(
  process.execPath,
  [path.join(path.dirname(tsxPackage), bin), 'watch', 'src/index.ts'],
  { cwd: import.meta.dirname, stdio: 'inherit', env }
)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
