#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

accountColNames = "CONCAT(QUOTE(user),'@',QUOTE(host)) UserAccount, User,Host";
privColNames = "Select_priv,Insert_priv,Update_priv,Delete_priv,Create_priv,Drop_priv,Reload_priv,Shutdown_priv,Process_priv,File_priv,Grant_priv,References_priv,Index_priv,Alter_priv,Show_db_priv,Super_priv,Create_tmp_table_priv,Lock_tables_priv,Execute_priv,Repl_slave_priv,Repl_client_priv,Create_view_priv,Show_view_priv,Create_routine_priv,Alter_routine_priv,Create_user_priv,Event_priv,Trigger_priv,Create_tablespace_priv";
sslColNames="ssl_type,ssl_cipher,x509_issuer,x509_subject";
extraColNames="max_questions,max_updates,max_connections,max_user_connections,password_expired";

queryGlobalPrivs="Host,User,Select_priv,Insert_priv,Update_priv,Delete_priv,Create_priv,Drop_priv,Reload_priv,Shutdown_priv,Process_priv,File_priv,Grant_priv,References_priv,Index_priv,Alter_priv,Show_db_priv,Super_priv,Create_tmp_table_priv,Lock_tables_priv,Execute_priv,Repl_slave_priv,Repl_client_priv,Create_view_priv,Show_view_priv,Create_routine_priv,Alter_routine_priv,Create_user_priv,Event_priv,Trigger_priv,Create_tablespace_priv,ssl_type,ssl_cipher,x509_issuer,x509_subject,max_questions,max_updates,max_connections,max_user_connections,plugin,authentication_string,password_expired,password_last_changed,password_lifetime,account_locked";

privs= "(CONCAT("
"IF(Alter_priv = 'Y', ',ALTER', ''),"
"IF(Alter_routine_priv = 'Y', ',ALTER ROUTINE', ''),"
"IF(Create_priv = 'Y', ',CREATE', ''),"
"IF(Create_routine_priv = 'Y', ',CREATE ROUTINE', ''),"
"IF(Create_tablespace_priv = 'Y', ',CREATE TABLESPACE', ''),"
"IF(Create_tmp_table_priv = 'Y', ',CREATE TEMPORARY TABLES', ''),"
"IF(Create_user_priv = 'Y', ',CREATE USER', ''),"
"IF(Create_view_priv = 'Y', ',CREATE VIEW', ''),"
"IF(Delete_priv = 'Y', ',DELETE', ''),"
"IF(Drop_priv = 'Y', ',DROP', ''),"
"IF(Event_priv = 'Y', ',EVENT', ''),"
"IF(Execute_priv = 'Y', ',EXECUTE', ''),"
"IF(File_priv = 'Y', ',FILE', ''),"
"IF(Grant_priv = 'Y', ',GRANT OPTION', ''),"
"IF(Index_priv = 'Y', ',INDEX', ''),"
"IF(Insert_priv = 'Y', ',INSERT', ''),"
"IF(Lock_tables_priv = 'Y', ',LOCK TABLE', ''),"
"IF(Process_priv = 'Y', ',PROCESS', ''),"
"IF(References_priv = 'Y', ',REFERENCES', ''),"
"IF(Reload_priv = 'Y', ',RELOAD', ''),"
"IF(Repl_client_priv = 'Y', ',REPLICATION CLIENT', ''),"
"IF(Repl_slave_priv = 'Y', ',REPLICATION SLAVE', ''),"
"IF(Repl_slave_priv = 'Y', ',REPLICATION SLAVE', ''),"
"IF(Select_priv = 'Y', ',SELECT',''),"
"IF(Show_db_priv = 'Y', ',SHOW DATABASE',''),"
"IF(Show_view_priv = 'Y', ',SHOW VIEW',''),"
"IF(Shutdown_priv = 'Y', ',SHUTDOWN',''),"
"IF(Super_priv = 'Y', ',SUPER',''),"
"IF(Trigger_priv = 'Y', ',TRIGGER',''),"
"IF(Update_priv = 'Y', ',UPDATE', '')"
")) as privlist";


privsDb= "CONCAT("
"IF(Alter_priv = 'Y', ',ALTER', ''),"
"IF(Alter_routine_priv = 'Y', ',ALTER ROUTINE', ''),"
"IF(Create_priv = 'Y', ',CREATE', ''),"
"IF(Create_routine_priv = 'Y', ',CREATE ROUTINE', ''),"
"IF(Create_tmp_table_priv = 'Y', ',CREATE TEMPORARY TABLES', ''),"
"IF(Create_view_priv = 'Y', ',CREATE VIEW', ''),"
"IF(Delete_priv = 'Y', ',DELETE', ''),"
"IF(Drop_priv = 'Y', ',DROP', ''),"
"IF(Event_priv = 'Y', ',EVENT', ''),"
"IF(Execute_priv = 'Y', ',EXECUTE', ''),"
"IF(Grant_priv = 'Y', ',GRANT OPTION', ''),"
"IF(Index_priv = 'Y', ',INDEX', ''),"
"IF(Insert_priv = 'Y', ',INSERT', ''),"
"IF(Lock_tables_priv = 'Y', ',LOCK TABLE', ''),"
"IF(References_priv = 'Y', ',REFERENCES', ''),"
"IF(Select_priv = 'Y', ',SELECT',''),"
"IF(Show_view_priv = 'Y', ',SHOW VIEW',''),"
"IF(Trigger_priv = 'Y', ',TRIGGER',''),"
"IF(Update_priv = 'Y', ',UPDATE', '')"
") as privlist";



/*allGlobalPrivs = "ALTER,ALTER ROUTINE,CREATE,CREATE ROUTINE,CREATE TABLESPACE,"
"CREATE TEMPORARY TABLES,CREATE USER,CREATE VIEW,DELETE,DROP,"
"EVENT,EXECUTE,FILE,GRANT OPTION,INDEX,INSERT,LOCK TABLES,PROCESS,REFERENCES,"
"RELOAD,REPLICATION CLIENT,REPLICATION SLAVE,SELECT,SHOW DATABASES,"
"SHOW VIEW,SHUTDOWN,SUPER,TRIGGER,UPDATE";
*/
allGlobalPrivs="ALTER,ALTER ROUTINE,CREATE,CREATE ROUTINE,CREATE TABLESPACE,"
"CREATE TEMPORARY TABLES,CREATE USER,CREATE VIEW,DELETE,DROP,EVENT,EXECUTE,"
"FILE,GRANT OPTION,INDEX,INSERT,LOCK TABLE,PROCESS,REFERENCES,RELOAD,"
"REPLICATION CLIENT,REPLICATION SLAVE,REPLICATION SLAVE,SELECT,SHOW DATABASE,"
"SHOW VIEW,SHUTDOWN,SUPER,TRIGGER,UPDATE";


/**
 *

global privs
   db = * && table = * && user = * && host=*  : check all databases
   db = * table = * backupuser 127.0.0.1 *
privs on a particular database for a particular user host
  db = anyvalue && table = *  && user = value && host = value

privs on a particular database for all users
  db = anyvalue && table = *  && user = * && host = *


privs on a particular database for a particular table for a particular user host
   db = dbname && table = tablename && user = value && host = value
*/

function main(mydb, table, user, hostname, hostAndPort)
{
    var hosts     = cluster::mySqlNodes();
    var result={};
    var value={};
    result["accounts"] = {};
    var requestType = "GLOBAL";
    var query = "";

    if (mydb == #N/A || mydb == "" || mydb == "*")
        requestType = "GLOBAL";
    else
    {
        if (mydb != "*")
        {
            requestType = "DB";
        }
        if (table != "*")
        {
            requestType = "TABLE";
        }

    }

    if (requestType == "GLOBAL")
    {
        query = "SELECT " + accountColNames + "," +
            privs + "," +
            extraColNames + "," +
            sslColNames +
            " FROM mysql.user";
        query += " WHERE ";
    }
    if (requestType == "DB")
    {
        query = "SELECT " + accountColNames + "," +
            privsDb  + ", db" +
            " FROM mysql.db WHERE ";
    }
    if (requestType == "TABLE")
    {
        query = "SELECT " + accountColNames + "," +
            "Table_priv , Db"  +
            " FROM mysql.tables_priv WHERE Table_name='" + table + "'";
        if (mydb != #N/A && mydb != "*" && mydb !="")
        {
            query += "AND Db='" + mydb + "'";
        }
    }

    if (user != "*" && user != #N/A)
    {
        if (query.endsWith("'"))
        {
            query += " AND";
        }
        query += " User='" + user + "'";
    }

    if (hostname != "*"  && hostname != #N/A)
    {
        if (query.endsWith("'"))
        {
            query += " AND";
        }
        query += " Host='" + hostname + "'";
    }

    if (mydb != "*"  && mydb != #N/A)
    {
        if (query.endsWith("'"))
        {
            query += " AND";
        }
        query = query + " Db='" + mydb + "' ";
    }

    if (query.endsWith("WHERE "))
    {
        query +=  "1=1";
    }
    i = 0;
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();

        if(!hostMatchesFilter(host,hostAndPort))
            continue;

        connected     = map["connected"];
        if (!connected)
            continue;

        isGalera  = map["isgalera"];
        if (isGalera)
        {
            localState = map["galera"]["localstatusstr"];
            if (localState != "Synced")
                continue;
        }

        retval = getResultSet(host, query);

        //   print (retval);
        if (retval != false)
        {
            var resultSet = retval["result"];
            nRows  = resultSet.rows();
            if (nRows==0)
                continue;
            var columns = resultSet.size();
            result["accounts"][idx]={};
            result["accounts"][idx]["report_host"] = host.toString();
            result["accounts"][idx]["report_hostname"] = host.hostName();
            result["accounts"][idx]["report_port"] = host.port();

            for (row = 0; row < nRows; ++row)
            {
                result["accounts"][idx][i]={};

                account = resultSet[row,0];
                user = resultSet[row,1];
                hostName = resultSet[row,2];
                privs = resultSet[row,3];
                if (requestType == "GLOBAL")
                {
                    max_questions = resultSet[row,4];
                    max_updates = resultSet[row,5];
                    max_connections = resultSet[row,6];
                    max_user_connections = resultSet[row,7];
                    password_expired = resultSet[row,8];
                    ssl_type = resultSet[row,9];
                    ssl_cipher = resultSet[row,10];
                    x509_issuer = resultSet[row,11];
                    x509_subject = resultSet[row,12];
                }


                if (privs == #N/A || privs == "")
                    privs = "USAGE";
                if(startswith(privs, ","))
                {
                    privs = privs.substr(1, privs.length());
                }
                result["accounts"][idx][i]["report_hostname"] = host.hostName();
                result["accounts"][idx][i]["report_port"] = host.port();
                result["accounts"][idx][i]["account"]=account;
                result["accounts"][idx][i]["user"]=user;
                result["accounts"][idx][i]["host"] = hostName;
                result["accounts"][idx][i]["privileges"] = privs;
                if (requestType == "GLOBAL")
                {
                    if (privs == allGlobalPrivs)
                        result["accounts"][idx][i]["privileges"] = "ALL PRIVILEGES";
                    result["accounts"][idx][i]["max_updates"] = max_updates;
                    result["accounts"][idx][i]["max_questions"] = max_questions;
                    result["accounts"][idx][i]["max_connections"] = max_connections;
                    result["accounts"][idx][i]["max_user_connections"] = max_user_connections;
                    result["accounts"][idx][i]["password_expired"] = password_expired;
                    result["accounts"][idx][i]["ssl_type"] = ssl_type;
                    result["accounts"][idx][i]["ssl_cipher"] = ssl_cipher;
                    result["accounts"][idx][i]["x509_issuer"] = x509_issuer;
                    result["accounts"][idx][i]["x509_subject"] = x509_subject;
                    result["accounts"][idx][i]["db"] = "*.*";
                    result["accounts"][idx][i]["schema"] = "*";
                    result["accounts"][idx][i]["table"] = "*";


                    if (privs.contains("GRANT OPTION"))
                    {
                        result["accounts"][idx][i]["is_grantable"] = true;
                    }
                    else
                    {
                        result["accounts"][idx][i]["is_grantable"] = false;
                    }
                }

                if (requestType == "DB")
                {
                    result["accounts"][idx][i]["schema"] = mydb;
                    result["accounts"][idx][i]["table"] = "*";
                }
                if (requestType == "TABLE")
                {
                    result["accounts"][idx][i]["schema"] = mydb;
                    result["accounts"][idx][i]["table"] = table;
                }

                i++;
            }
        }
    }
    exit(result);
}
