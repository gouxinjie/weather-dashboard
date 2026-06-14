/**
 * @file 开发环境统一启动脚本
 * @description 统一启动前端与后端开发服务，替代批处理启动方式
 */

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
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
let isShuttingDown = false;

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

try {
  installDependenciesIfMissing(serverRoot, '后端');
  warnIfEnvMissing(path.join(serverRoot, '.env'));

  console.log('========================================');
  console.log('城市环境与天气大屏 开发环境启动中');
  console.log('前端地址: http://localhost:3200');
  console.log('后端地址: http://localhost:3201');
  console.log('按 Ctrl+C 可同时关闭前后端服务');
  console.log('========================================');

  startProcess('后端服务', serverRoot, ['run', 'dev']);
  startProcess('前端服务', projectRoot, ['run', 'dev:client']);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : '未知错误';
  console.error(`[错误] 开发环境启动失败：${errorMessage}`);
  shutdown(1);
}
