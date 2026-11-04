import {query} from '../config/db.js';
export async function notify(userId,type,title,message,relatedId=null){await query('INSERT INTO notifications (user_id,type,title,message,related_id) VALUES (?,?,?,?,?)',[userId,type,title,message,relatedId]);}
