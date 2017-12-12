#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

QUERY="SELECT DISTINCT m.user, m.host FROM mysql.user m "
" LEFT JOIN performance_schema.accounts p "
"   ON m.user = p.user AND p.host LIKE m.host     "
" LEFT JOIN information_schema.ROUTINES is_r"
"   ON is_r.SECURITY_TYPE = 'DEFINER' AND "
"      is_r.DEFINER LIKE CONCAT(m.user, '@', m.host)"
" LEFT JOIN information_schema.EVENTS is_e"
"   ON is_e.DEFINER LIKE CONCAT(m.user, '@', m.host)"
" LEFT JOIN information_schema.TRIGGERS is_t"
"   ON is_t.DEFINER LIKE CONCAT(m.user, '@', m.host)"
" WHERE p.USER IS NULL AND "
"   is_r.DEFINER IS NULL AND is_e.DEFINER IS NULL AND "
"   is_t.DEFINER IS NULL  AND NOT ((m.user='root' or m.user='cmon') AND"
"       (m.host='localhost' or m.host='127.0.0.1'))"
" ORDER BY user, host";

var query2="SELECT count(table_name)"
" FROM information_schema.tables"
" WHERE table_schema "
"NOT IN ('mysql', 'INFORMATION_SCHEMA','performance_schema', 'ndbinfo')";

var MAX_TABLES=4096;

HOURS=1;

function main(hostAndPort)
{
    var hosts  = cluster::mySqlNodes();
    var result = {};
    var k      = 0;
  
    result["unused_accounts"] = [];
    
    cmonConfig       = conf::values();

    var exists = cmonConfig.keys().contains("enable_is_queries");    
    if (exists)     
        if (!cmonConfig["enable_is_queries"].toBoolean())
        {
            result["error_msg"] = "Information_schema queries are not enabled.";
            print(result["error_msg"]);
            exit(result);
        }
    

    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        
        if(!hostMatchesFilter(host,hostAndPort))
            continue;
      
        map           = host.toMap();
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
        else
        {
            isReadOnly = map["readonly"].toBoolean();
            if (hosts.size()>1 && !isReadOnly.toBoolean())
            {
                continue;
            }
        }

        var uptime       = readStatusVariable(host, "Uptime").toInt();
        var hostname     = host.hostName();
        var hostnamePort = host.port();

        print("-------------------------");
        print(host, ":");
        print(" ");
        query_ret = getValueMap(host, QUERY);
        
        if (uptime < HOURS*3600)
        {
            result["error_msg"] = "Server must have been running for " + HOURS +" hours to check"
            " unused accounts since last server restart";
            
            print(result["error_msg"]);
            continue;
        }

        var tableCount = getSingleValue(host, query2);

        if (tableCount.toInt() > MAX_TABLES)
        {
            result["error_msg"] = "Too many tables. I_S queries are not recommended.";
            print(result["error_msg"]);
            exit(result);
        }

        print("The following accounts have not been used since the last"
              " server restart (" + uptime + " seconds ago):<br/>");

        if (query_ret != false && query_ret.size() > 0)
        {
            for (i=0; i<query_ret.size(); ++i)
            {
                user = query_ret[i][0];
                host = query_ret[i][1];
              
                result["unused_accounts"][k] = {};
                result["unused_accounts"][k]["hostname"] = hostname;
                result["unused_accounts"][k]["uptime"]   = uptime;
                result["unused_accounts"][k]["port"]     = hostnamePort;
                result["unused_accounts"][k]["user"]     = user;
                result["unused_accounts"][k]["host"]     = host;
              
                print("'" + user + "'@'" + host + "'<br/>");
                k++;
            }
        }
        else
        {
            print("no data found");
        }
    }
    exit(result);
}
