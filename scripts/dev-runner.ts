/**
 * @file 开发环境统一启动脚本
 * @description 统一启动前端与后端开发服务，替代批处理启动方式
 */

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

/**
 * @interface ManagedProcess
 * @description 已托管的子进程定义
 */
interface ManagedProcess {
  /** 子进程名称 */
  name: string;
  /** 子进程实例 */
  child: ChildProcess;
}

const projectRoot = process.cwd();
const serverRoot = path.join(projectRoot, 'server');
const managedProcesses: ManagedProcess[] = [];
const defaultBackendPort = 3201;
const portProbeIgnoredErrorCodes = new Set([
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EADDRNOTAVAIL',
  'EAFNOSUPPORT',
]);
let isShuttingDown = false;

/**
 * @interface PortProbeResult
 * @description 本地端口探测结果定义
 */
interface PortProbeResult {
  /** 探测主机 */
  host: string;
  /** 端口是否已被占用 */
  occupied: boolean;
}

/**
 * @function runNpmCommand
 * @description 以当前系统兼容的方式执行 npm 命令
 * @param command 类型：string；含义：npm 子命令文本；是否必填：是；默认值：无
 * @param cwd 类型：string；含义：执行目录；是否必填：是；默认值：无
 * @param stdio 类型：'inherit' | 'ignore'；含义：标准输入输出模式；是否必填：是；默认值：无
 * @returns 类型：ChildProcess；含义：已启动的子进程实例
 * @throws 无
 */
function runNpmCommand(command: string, cwd: string, stdio: 'inherit' | 'ignore'): ChildProcess {
  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/d', '/s', '/c', `npm ${command}`], {
      cwd,
      stdio,
    });
  }

  const commandArgs = command.split(' ');

  return spawn('npm', commandArgs, {
    cwd,
    stdio,
  });
}

/**
 * @function installDependenciesIfMissing
 * @description 当目标目录缺少 node_modules 时自动安装依赖
 * @param targetRoot 类型：string；含义：目标目录；是否必填：是；默认值：无
 * @param label 类型：string；含义：终端展示名称；是否必填：是；默认值：无
 * @returns 类型：void；含义：无返回值
 * @throws 当 npm install 执行失败时抛出异常
 */
function installDependenciesIfMissing(targetRoot: string, label: string): void {
  const modulesPath = path.join(targetRoot, 'node_modules');

  if (existsSync(modulesPath)) {
    return;
  }

  console.log(`[${label}] 未检测到依赖，正在执行 npm install...`);

  const installResult =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm install'], {
          cwd: targetRoot,
          stdio: 'inherit',
        })
      : spawnSync('npm', ['install'], {
          cwd: targetRoot,
          stdio: 'inherit',
        });

  if (installResult.status !== 0) {
    throw new Error(`[${label}] 依赖安装失败，请检查 npm 日志。`);
  }
}

/**
 * @function warnIfEnvMissing
 * @description 当后端环境变量文件缺失时输出提示，避免启动后才发现配置缺失
 * @param envFilePath 类型：string；含义：环境变量文件路径；是否必填：是；默认值：无
 * @returns 类型：void；含义：无返回值
 * @throws 无
 */
function warnIfEnvMissing(envFilePath: string): void {
  if (existsSync(envFilePath)) {
    return;
  }

  console.warn('[提示] 未检测到 server/.env，请确认已配置和风天气相关环境变量。');
}

/**
 * @function parseServerEnvFile
 * @description 读取并解析 server/.env 中的键值对，保持开发启动脚本与后端配置来源一致
 * @param envFilePath 类型：string；含义：后端环境变量文件路径；是否必填：是；默认值：无
 * @returns 类型：Record<string, string>；含义：解析后的环境变量键值映射
 * @throws 当文件读取失败时抛出异常
 */
function parseServerEnvFile(envFilePath: string): Record<string, string> {
  if (!existsSync(envFilePath)) {
    return {};
  }

  const envContent = readFileSync(envFilePath, 'utf8');
  const envEntries: Record<string, string> = {};

  for (const line of envContent.split(/\r?\n/u)) {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const normalizedLine = trimmedLine.startsWith('export ')
      ? trimmedLine.slice('export '.length).trim()
      : trimmedLine;
    const separatorIndex = normalizedLine.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    const rawValue = normalizedLine.slice(separatorIndex + 1).trim();

    if (key === '') {
      continue;
    }

    const isWrappedByQuotes =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"));
    const normalizedValue = isWrappedByQuotes
      ? rawValue.slice(1, -1)
      : rawValue.split(/\s+#/u, 1)[0].trim();

    envEntries[key] = normalizedValue;
  }

  return envEntries;
}

/**
 * @function resolveBackendPort
 * @description 按后端相同的优先级解析实际监听端口：优先读取进程环境变量，其次读取 server/.env，最后回退默认值
 * @param envFilePath 类型：string；含义：后端环境变量文件路径；是否必填：是；默认值：无
 * @returns 类型：number；含义：后端实际监听端口
 * @throws 当端口值非法时抛出异常
 */
function resolveBackendPort(envFilePath: string): number {
  const envEntries = parseServerEnvFile(envFilePath);
  const portValue = process.env.PORT ?? envEntries.PORT ?? String(defaultBackendPort);
  const parsedPort = Number.parseInt(portValue, 10);

  if (Number.isNaN(parsedPort) || parsedPort <= 0) {
    throw new Error(`[端口配置] 检测到无效的后端端口配置：${portValue}`);
  }

  return parsedPort;
}

/**
 * @function probePort
 * @description 探测指定主机端口是否已有本地服务监听
 * @param host 类型：string；含义：待探测的主机地址；是否必填：是；默认值：无
 * @param port 类型：number；含义：待探测的端口号；是否必填：是；默认值：无
 * @returns 类型：Promise<PortProbeResult>；含义：端口探测结果
 * @throws 当探测过程中出现非连接拒绝类异常时抛出
 */
function probePort(host: string, port: number): Promise<PortProbeResult> {
  return new Promise<PortProbeResult>((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.once('connect', () => {
      socket.destroy();
      resolve({ host, occupied: true });
    });

    socket.once('error', (error: NodeJS.ErrnoException) => {
      socket.destroy();

      if (typeof error.code === 'string' && portProbeIgnoredErrorCodes.has(error.code)) {
        resolve({ host, occupied: false });
        return;
      }

      reject(error);
    });

    socket.setTimeout(800, () => {
      socket.destroy();
      resolve({ host, occupied: false });
    });
  });
}

/**
 * @function ensureBackendPortAvailable
 * @description 在启动开发环境前检查后端端口是否已被占用，避免重复启动时触发未处理异常
 * @param port 类型：number；含义：后端监听端口；是否必填：是；默认值：无
 * @returns 类型：Promise<void>；含义：检查通过时无返回值
 * @throws 当端口已被占用时抛出异常
 */
async function ensureBackendPortAvailable(port: number): Promise<void> {
  const probeHosts = ['127.0.0.1', '::1'];
  const probeResults = await Promise.all(probeHosts.map((host) => probePort(host, port)));
  const occupiedHosts = probeResults.filter((result) => result.occupied).map((result) => result.host);

  if (occupiedHosts.length === 0) {
    return;
  }

  throw new Error(
    `[端口检查] 检测到后端端口 ${port} 已被占用（${occupiedHosts.join('、')}），请先停止已有服务后再启动。`
  );
}

/**
 * @function startProcess
 * @description 启动一个 npm 子进程，并在异常退出时触发统一收尾
 * @param name 类型：string；含义：进程名称；是否必填：是；默认值：无
 * @param cwd 类型：string；含义：启动目录；是否必填：是；默认值：无
 * @param args 类型：string[]；含义：npm 参数列表；是否必填：是；默认值：无
 * @returns 类型：ChildProcess；含义：已启动的子进程实例
 * @throws 无
 */
function startProcess(name: string, cwd: string, args: string[]): ChildProcess {
  console.log(`[启动] ${name}`);

  const child = runNpmCommand(args.join(' '), cwd, 'inherit');

  managedProcesses.push({ name, child });

  child.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
    if (isShuttingDown) {
      return;
    }

    const exitDetail = signal ? `信号 ${signal}` : `退出码 ${code ?? '未知'}`;
    console.error(`[退出] ${name} 已停止，${exitDetail}`);
    shutdown(typeof code === 'number' ? code : 1);
  });

  child.on('error', (error: Error) => {
    if (isShuttingDown) {
      return;
    }

    console.error(`[错误] ${name} 启动失败：${error.message}`);
    shutdown(1);
  });

  return child;
}

/**
 * @function shutdown
 * @description 统一关闭已启动的子进程，避免出现孤儿进程
 * @param exitCode 类型：number；含义：进程退出码；是否必填：否；默认值：0
 * @returns 类型：void；含义：无返回值
 * @throws 无
 */
function shutdown(exitCode = 0): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const { child } of managedProcesses) {
    if (!child.pid) {
      continue;
    }

    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
      });
      continue;
    }

    if (!child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 300);
}

process.on('SIGINT', () => {
  shutdown(0);
});

process.on('SIGTERM', () => {
  shutdown(0);
});

async function main(): Promise<void> {
  const serverEnvFilePath = path.join(serverRoot, '.env');
  const backendPort = resolveBackendPort(serverEnvFilePath);

  installDependenciesIfMissing(serverRoot, '后端');
  warnIfEnvMissing(serverEnvFilePath);
  await ensureBackendPortAvailable(backendPort);

  console.log('========================================');
  console.log('城市环境与天气大屏 开发环境启动中');
  console.log('前端地址: http://localhost:3200');
  console.log(`后端地址: http://localhost:${backendPort}`);
  console.log('按 Ctrl+C 可同时关闭前后端服务');
  console.log('========================================');

  startProcess('后端服务', serverRoot, ['run', 'dev']);
  startProcess('前端服务', projectRoot, ['run', 'dev:client']);
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : '未知错误';
  console.error(`[错误] 开发环境启动失败：${errorMessage}`);
  shutdown(1);
});
