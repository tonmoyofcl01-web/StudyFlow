import mysql from 'mysql2/promise';
import {env} from './env.js';
export const pool = mysql.createPool({...env.db, waitForConnections:true, connectionLimit:10, queueLimit:0, timezone:'Z', dateStrings:false, decimalNumbers:true, charset:'utf8mb4'});
export async function query(sql, params=[]) { const [rows]=await pool.execute(sql,params); return rows; }
export async function withTransaction(fn) { const conn=await pool.getConnection(); try { await conn.beginTransaction(); const result=await fn(conn); await conn.commit(); return result; } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); } }
