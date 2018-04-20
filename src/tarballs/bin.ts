import * as Config from '@oclif/config'
import * as qq from 'qqjs'

export async function writeBinScripts({config, baseWorkspace, nodeVersion}: {config: Config.IConfig, baseWorkspace: string, nodeVersion: string}) {
  const {bin} = config
  const binPathEnvVar = config.scopedEnvVarKey('BINPATH')
  const redirectedEnvVar = config.scopedEnvVarKey('REDIRECTED')
  const writeWin32 = async () => {
    await qq.write([baseWorkspace, 'bin', `${config.bin}.cmd`], `@echo off

if not "%${redirectedEnvVar}%"=="1" if exist "%LOCALAPPDATA%\\${bin}\\client\\bin\\${bin}.cmd" (
  set ${redirectedEnvVar}=1
  rem "%LOCALAPPDATA%\\${bin}\\client\\bin\\${bin}.cmd" %*
  exit /B
)

set ${binPathEnvVar}="%~dp0${bin}.cmd"
if exist "%~dp0..\\bin\\node.exe" (
  "%~dp0..\\bin\\node.exe" "%~dp0..\\bin\\run" %*
) else if exist "%LOCALAPPDATA%\\oclif\\node\\node-${nodeVersion}.exe" (
  "%LOCALAPPDATA%\\oclif\\node\\node-${nodeVersion}.exe" "%~dp0..\\bin\\run" %*
) else (
  node "%~dp0..\\bin\\run" %*
)
`)
    // await qq.write([output, 'bin', config.bin], `#!/bin/sh
// basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")
// "$basedir/../client/bin/${config.bin}.cmd" "$@"
// ret=$?
// exit $ret
// `)
  }
  const writeUnix = async () => {
    const bin = qq.join([baseWorkspace, 'bin', config.bin])
    await qq.write(bin, `#!/usr/bin/env bash
set -e
echoerr() { echo "$@" 1>&2; }

get_script_dir () {
  SOURCE="\${BASH_SOURCE[0]}"
  # While \$SOURCE is a symlink, resolve it
  while [ -h "\$SOURCE" ]; do
    DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
    SOURCE="\$( readlink "\$SOURCE" )"
    # If \$SOURCE was a relative symlink (so no "/" as prefix, need to resolve it relative to the symlink base directory
    [[ \$SOURCE != /* ]] && SOURCE="\$DIR/\$SOURCE"
  done
  DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
  echo "\$DIR"
}
DIR=\$(get_script_dir)
CLI_HOME=\$(cd && pwd)
XDG_DATA_HOME=\${XDG_DATA_HOME:="\$CLI_HOME/.local/share"}
BIN_PATH="\$XDG_DATA_HOME/${config.dirname}/client/bin/${config.bin}"
if [ -z "\$${redirectedEnvVar}" ] && [ -x "\$BIN_PATH" ] && [[ ! "\$DIR/${config.bin}" -ef "\$BIN_PATH" ]]; then
  if [ "\$DEBUG" == "*" ]; then
    echoerr "\$BIN_PATH" "\$@"
  fi
  ${redirectedEnvVar}=1 "\$BIN_PATH" "\$@"
else
  if [ -x "$(command -v "\$XDG_DATA_HOME/oclif/node/node-custom")" ]; then
    NODE="\$XDG_DATA_HOME/oclif/node/node-custom"
  elif [ -x "$(command -v "\$DIR/node")" ]; then
    NODE="\$DIR/node"
  elif [ -x "$(command -v "\$XDG_DATA_HOME/oclif/node/node-${nodeVersion}")" ]; then
    NODE="\$XDG_DATA_HOME/oclif/node/node-${nodeVersion}"
  elif [ -x "$(command -v node)" ]; then
    NODE=node
  else
    echoerr 'Error: node is not installed.' >&2
    exit 1
  fi
  if [ "\$DEBUG" == "*" ]; then
    echoerr ${binPathEnvVar}="\$DIR/${config.bin}" "\$NODE" "\$DIR/run" "\$@"
  fi
  ${binPathEnvVar}="\$DIR/${config.bin}" "\$NODE" "\$DIR/run" "\$@"
fi
`)
    await qq.chmod(bin, 0o755)
  }

  await writeWin32()
  await writeUnix()
}
