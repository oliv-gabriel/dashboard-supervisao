import oracledb from 'oracledb';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
};

async function run() {
  try {
    if (process.env.ORACLE_LIB_DIR) {
      oracledb.initOracleClient({ libDir: process.env.ORACLE_LIB_DIR });
    }
  } catch (err) {}

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT MAX(DATA) as MAX_DATA FROM PCMETA`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log("Max DATA in PCMETA:", result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

run();
