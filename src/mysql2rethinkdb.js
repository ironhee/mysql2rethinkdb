import chalk from 'chalk';
import mysql from 'mysql';
import _ from 'lodash';
import {
  getMysqlTables,
  getMysqlTableRows,
  importIntoRethinkdb,
} from './helpers';
import { promisify } from 'bluebird';
const runParallelLimit = promisify(require('run-parallel-limit'));

function logMigrationStart() {
  console.log(chalk.cyan.bold('Migration start.'));
}

function logTables(tables) {
  console.log(chalk.yellow(`${ tables.length } mysql tables are selected.`));
}

function logTableMigrated(database, table) {
  console.log(chalk.green(`[Migrated] ${database}.${table}`));
}

function logTableMigrationFail(database, table, error) {
  console.log(chalk.red(`[Error] ${database}.${table}`, error));
}

function logMigrationEnd() {
  console.log(chalk.cyan.bold('Migration end.'));
}

async function mysql2rethinkdb(options = {}) {
  const {
    mysql: mysqlOptions,
    rethinkdb: rethinkdbOptions,
    workers = 8,
    transform,
  } = options;
  let { tables } = options;

  const connection = mysql.createConnection(mysqlOptions);

  connection.connect();

  logMigrationStart();

  if (!tables) {
    tables = await getMysqlTables(connection);
  }

  logTables(tables);

  await runParallelLimit(
    _.map(tables, table => async callback => {
      try {
        const rows = await getMysqlTableRows({ connection, table });
        await importIntoRethinkdb({
          host: rethinkdbOptions.host,
          port: rethinkdbOptions.port,
          database: rethinkdbOptions.database,
          authKey: rethinkdbOptions.authKey,
          table,
          rows,
          ..._.isFunction(transform) ? transform({ table, rows }) : {},
        });
        logTableMigrated(rethinkdbOptions.database, table);
        callback(null, table);
      } catch (e) {
        logTableMigrationFail(rethinkdbOptions.database, table, e);
        callback(table, null);
      }
    }), workers
  );

  logMigrationEnd();

  connection.end();
}

export default mysql2rethinkdb;
