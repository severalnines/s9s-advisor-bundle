#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

 
query="SELECT user, host FROM mysql.user WHERE user <> 'cmon'";

/*
* get a list of mysql user and hosts

*/
function main(hostAndPort)
{
    var hosts     = cluster::mySqlNodes();
    var result={};
    result["dbusers"] = {};

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
        result["dbusers"][idx] = {};
        result["dbusers"][idx]["host"]={};
        result["dbusers"][idx]["host"]["hostname"] = host.hostName();
        result["dbusers"][idx]["host"]["port"] = host.port();
        if (ret != false && ret.size() > 0)
        {
            for (i=0; i<ret.size(); ++i)
            {
                user = ret[i][0];
                host = ret[i][1];
                password = ret[i][2];

                result["dbusers"][idx]["host"][i]={};
                result["dbusers"][idx]["host"][i]["user"]=user;
                result["dbusers"][idx]["host"][i]["host"]=host;
                result["dbusers"][idx]["host"][i]["password"]=password;
            }
        }
    }
    print(result);
    exit(result);
}
