/* eslint no-param-reassign: 0 */
import _ from 'lodash';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { promisifyAll } from 'bluebird';
const shell = promisifyAll(require('shelljs'));


export async function runShellCommand(cmd) {
  return await shell.execAsync(cmd, { silent: true });
}

export function removeFile(fileName) {
  shell.rm(fileName);
}

export async function getMysqlTables(connection) {
  connection = promisifyAll(connection);
  const rows = await connection.queryAsync(`SHOW TABLES`);
  const tables = _.map(rows, row => _.values(row)[0]);
  return tables;
}

export async function getMysqlTableRows({ connection, table }) {
  connection = promisifyAll(connection);
  return await connection.queryAsync(`SELECT * FROM ${table}`);
}

export function saveTableRowsAsJson({ table, rows }) {
  const fileName = path.join(os.tmpdir(), `${table}.json`);
  fs.writeFileSync(fileName, JSON.stringify(rows));
  return fileName;
}

export async function importRethinkdbFromJson({ fileName, database, table }) {
  const cmd = `
    rethinkdb import \
      -f ${fileName} \
      --table ${database}.${table} \
      --force
  `;
  return await runShellCommand(cmd);
}

export async function importIntoRethinkdb({ database, table, rows }) {
  const fileName = saveTableRowsAsJson({ table, rows });
  await importRethinkdbFromJson({
    fileName,
    database,
    table,
  });
  removeFile(fileName);
}
