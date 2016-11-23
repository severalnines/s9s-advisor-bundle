#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"


/**
 * Show grants for users
 */
queryGlobalPrivs="SELECT GRANTEE, IS_GRANTABLE, "
      " GROUP_CONCAT(PRIVILEGE_TYPE ORDER BY PRIVILEGE_TYPE) FROM"
      " information_schema.user_privileges GROUP BY GRANTEE";

queryGlobalPrivsWithUser="SELECT GRANTEE, IS_GRANTABLE, "
      " GROUP_CONCAT(PRIVILEGE_TYPE ORDER BY PRIVILEGE_TYPE) FROM"
      " information_schema.user_privileges WHERE GRANTEE='@@USERHOST@@' GROUP BY GRANTEE";
      
querySchemaPrivsForUser="SELECT GRANTEE, IS_GRANTABLE,"
      " GROUP_CONCAT(PRIVILEGE_TYPE ORDER BY PRIVILEGE_TYPE), TABLE_SCHEMA FROM"
      " information_schema.schema_privileges WHERE GRANTEE='@@USERHOST@@'"
      " GROUP BY TABLE_SCHEMA";
     
querySchemaPrivsForSchema="SELECT GRANTEE, IS_GRANTABLE,"
      " GROUP_CONCAT(PRIVILEGE_TYPE ORDER BY PRIVILEGE_TYPE), TABLE_SCHEMA FROM"
      " information_schema.schema_privileges WHERE TABLE_SCHEMA='@@SCHEMA@@'"
      " GROUP BY GRANTEE";
      
      
queryTablePrivs="SELECT GRANTEE, IS_GRANTABLE,"
      " GROUP_CONCAT(PRIVILEGE_TYPE ORDER BY PRIVILEGE_TYPE), TABLE_NAME FROM"
      " information_schema.table_privileges WHERE GRANTEE='@@USERHOST@@'"
      " AND TABLE_SCHEMA='@@SCHEMA@@'"
      " GROUP BY TABLE_NAME";

allGlobalPrivs = "ALTER,ALTER ROUTINE,CREATE,CREATE ROUTINE,CREATE TABLESPACE,"
           "CREATE TEMPORARY TABLES,CREATE USER,CREATE VIEW,DELETE,DROP,"
           "EVENT,EXECUTE,FILE,INDEX,INSERT,LOCK TABLES,PROCESS,REFERENCES,"
           "RELOAD,REPLICATION CLIENT,REPLICATION SLAVE,SELECT,SHOW DATABASES,"
           "SHOW VIEW,SHUTDOWN,SUPER,TRIGGER,UPDATE";

extraInfoQuery = "SELECT ssl_type,max_questions,max_updates,max_connections,"
            "max_user_connections, password_expired  FROM mysql.user "
            "WHERE user='@@USER@@' AND host ='@@HOST@@'";

/** 
global privs 
   db = * && table = * && user = * && host=*  : check all databases

privs on a particular database for a particular user host 
  db = anyvalue && table = *  && user = value && host = value 
  
privs on a particular database for all users
  db = anyvalue && table = *  && user = * && host = * 


privs on a particular database for a particular table for a particular user host 
   db = dbname && table = tablename && user = value && host = value 
*/
    
function main(db, table, user, hostname, hostAndPort)
{
    var hosts     = cluster::mySqlNodes();
    var result={};
    result["grants"] = {};
    var requestType = "GLOBAL";
    
     if (user.toString() == "" || user == #N/A ||
        user.empty())
    {
        result["error_msg"] = "Argument 'user' not specified"; 
        exit(result);
    }
    
    if (hostname.toString() == "" || hostname == #N/A ||
        hostname.empty())
    {
        result["error_msg"] = "Argument 'hostname' not specified"; 
        exit(result);
    }
    if (db=="*")
    {
        if (user!="*" && hostname !="*" )
        {
            query =  querySchemaPrivsForUser;
            requestType = "SCHEMA";
            query.replace("@@USERHOST@@", escape("'" + user + "'@'" + hostname + "'"));
        }
        else
        {
            query =  queryGlobalPrivs;
        }        
    }
    else
    {
      if (table == "*")
      {
         if (user != "*" && hostname != "*")
         {
            query = querySchemaPrivsForUser;
            requestType = "SCHEMA";
            query.replace("@@USERHOST@@", escape("'" + user + "'@'" + hostname + "'"));
         }
         else
         {
            query = querySchemaPrivsForSchema;
            requestType = "SCHEMA";
            query.replace("@@SCHEMA@@", db);
         }
      }
      else
      {
        query = queryTablePrivs;
        requestType = "TABLE";
        query.replace("@@USERHOST@@", escape("'" + user + "'@'" + hostname + "'"));
          query.replace("@@SCHEMA@@", db);
      }
    }    
    
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        
        if(!hostMatchesFilter(host,hostAndPort))
            continue;
            
        connected     = map["connected"];
        if (!connected)
            continue;
        
                    
        ret = getValueMap(host, query);
        result["grants"][idx] = {};
        result["grants"][idx]["grant"]={};
        result["grants"][idx]["grant"]["hostname"] = host.hostName();
        result["grants"][idx]["grant"]["port"] = host.port();

        if (ret != false && ret.size() > 0)
        {
            for (i=0; i<ret.size(); ++i)
            {
                grantee = ret[i][0];
                is_grantable = ret[i][1];
                privs = ret[i][2];
                schema = db;
                table = "*";
                if (requestType == "GLOBAL" && privs == allGlobalPrivs)
                   privs = "ALL PRIVILEGES";
                   
                if (requestType == "SCHEMA")
                {
                   schema =  ret[i][3]; 
                }
                if (requestType == "TABLE")
                {
                    table = ret[i][3];
                }

                result["grants"][idx]["grant"][i]={};
                result["grants"][idx]["grant"][i]["grantee"]=grantee;
                result["grants"][idx]["grant"][i]["is_grantable"]=is_grantable;
                result["grants"][idx]["grant"][i]["privs"]=privs;
                result["grants"][idx]["grant"][i]["schema"]=schema;
                result["grants"][idx]["grant"][i]["table"]=table;
                tmpQuery = extraInfoQuery;
                thisUserHost = grantee.split("@");
                tmpUser = thisUserHost[0].replace("'","");
                tmpHost = thisUserHost[1].replace("'","");
                tmpQuery.replace("@@USER@@", tmpUser);    
                tmpQuery.replace("@@HOST@@", tmpHost);
                ret2 = executeSqlCommand2(host,tmpQuery);
                var extraInfo = getValueMap(host,tmpQuery);
                ssl_type = extraInfo[0][0];
                max_questions = extraInfo[0][1];
                max_updates = extraInfo[0][2];
                max_connections = extraInfo[0][3];
                max_user_connections = extraInfo[0][4];
                password_expired = extraInfo[0][5];
                
                result["grants"][idx]["grant"][i]["ssl_type"]=ssl_type;
                result["grants"][idx]["grant"][i]["max_questions"]=max_questions;
                result["grants"][idx]["grant"][i]["max_updates"]=max_updates;
                result["grants"][idx]["grant"][i]["max_connections"]=max_connections;
                result["grants"][idx]["grant"][i]["max_user_connections"]=max_user_connections;
                result["grants"][idx]["grant"][i]["password_expired"]=password_expired;
            }
        }
    }
    exit(result);
}


