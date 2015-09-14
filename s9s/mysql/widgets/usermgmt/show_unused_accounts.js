#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

 
QUERY="SELECT DISTINCT m.user, m.host FROM mysql.user m "
      " LEFT JOIN performance_schema.accounts p "
      "   ON m.user = p.user AND p.host LIKE m.host     "
      " LEFT JOIN information_schema.views is_v"
      "   ON is_v.SECURITY_TYPE = 'DEFINER' AND "
      "      is_v.DEFINER LIKE CONCAT(m.user, '@', m.host) "
      " LEFT JOIN information_schema.ROUTINES is_r"
      "   ON is_r.SECURITY_TYPE = 'DEFINER' AND "
      "      is_r.DEFINER LIKE CONCAT(m.user, '@', m.host)"
      " LEFT JOIN information_schema.EVENTS is_e"
      "   ON is_e.DEFINER LIKE CONCAT(m.user, '@', m.host)"
      " LEFT JOIN information_schema.TRIGGERS is_t"
      "   ON is_t.DEFINER LIKE CONCAT(m.user, '@', m.host)"
      " WHERE p.USER IS NULL AND is_v.DEFINER IS NULL AND "
      "   is_r.DEFINER IS NULL AND is_e.DEFINER IS NULL AND "
      "   is_t.DEFINER IS NULL  AND NOT ((m.user='root' or m.user='cmon') AND"
      "       (m.host='localhost' or m.host='127.0.0.1'))"    
      " ORDER BY user, host";

HOURS=8;

function main(hostAndPort)
{
    var hosts     = cluster::mySqlNodes();
    var result={};
    result["unused_accounts"] = {};

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        if(!hostMatchesFilter(host,hostAndPort))
            continue;
        map         = host.toMap();
        connected     = map["connected"];
        if (!connected)
            continue;
        
        var uptime = readStatusVariable(host, "Uptime").toInt();
        
        print("-------------------------");
        print(host, ":");
        print(" ");
        query_ret = getValueMap(host, QUERY);
        result["unused_accounts"][idx] = {};
        result["unused_accounts"][idx]["host"]={};
        result["unused_accounts"][idx]["host"]["hostname"] = host.hostName();
        result["unused_accounts"][idx]["host"]["port"] = host.port();
        result["unused_accounts"][idx]["host"]["uptime"] = uptime;
        if (uptime < HOURS*3600)
        {
            result["unused_accounts"][idx]["host"]["error_msg"] = 
                "Server must have been running for " + HOURS +" hours to check"
            " unused accounts since last server restart";
            print(result["unused_accounts"][idx]["host"]["error_msg"]);
            
            continue;
        }
        
        print("The following accounts have not been used since the last"
              " server restart (" + uptime + " seconds ago):<br/>");
        
        if (query_ret != false && query_ret.size() > 0)
        {
            for (i=0; i<query_ret.size(); ++i)
            {
                user = query_ret[i][0];
                host = query_ret[i][1];
                result["unused_accounts"][idx]["host"][i]={};
                result["unused_accounts"][idx]["host"][i]["user"]=user;
                result["unused_accounts"][idx]["host"][i]["host"]=host;
                print("'" + user + "'@'" + host + "'<br/>");
            }
        }
        else
        {
            print("no data found");
        }
    }
    exit(result);
}
