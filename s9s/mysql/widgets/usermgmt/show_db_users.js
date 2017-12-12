#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"


query="SELECT user, host FROM mysql.user WHERE user <> 'cmon' ORDER BY user";

/*
* get a list of mysql user and hosts

*/
function main(hostAndPort)
{
    var hosts     = cluster::mySqlNodes();
    var result    = {};
    var k = 0;
    var port = '';
    result["dbusers"] = [];

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
        else
        {
            isReadOnly = map["readonly"].toBoolean();
            if (hosts.size()>1 && !isReadOnly.toBoolean())
            {
                continue;
            }
        }
        ret = getValueMap(host, query);
        port = host.port();

        if (ret != false && ret.size() > 0)
        {
            for (i=0; i<ret.size(); ++i)
            {
                user = ret[i][0];
                host = ret[i][1];
                password = ret[i][2];

                result["dbusers"][k] = {};
                result["dbusers"][k]["hostname"] = host;
                result["dbusers"][k]["port"] = port;
                result["dbusers"][k]["user"] = user;
                result["dbusers"][k]["password"] = password;

                k++;
            }
        }
        break;
    }
    print(result);
    exit(result);
}
