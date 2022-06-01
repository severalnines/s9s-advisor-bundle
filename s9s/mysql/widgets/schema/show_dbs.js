#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * List schemas grouped by host.
 * Format:  hostAndPort
 * hostAndPort : * for all hosts or 10.10.10.10:3306
 */

#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * List schemas grouped by host.
 * Format:  hostAndPort
 * hostAndPort : * for all hosts or 10.10.10.10:3306
 */

query="SHOW DATABASES";

function main(hostAndPort) {
    var hosts = cluster::mySqlNodes();
    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var result={};
    result["schemas"] = [];
    var k = 0;
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;

        map = host.toMap();
        connected = map["connected"];
        if (connected) {

            ret = getValueMap(host, query);
            if (ret != false && ret.size() > 0)
            {

                for (i=0; i<ret.size(); ++i)
                {
                    var localIndex = k + i;
                    dbName =  ret[i][0];
                    if (dbName == "performance_schema" ||
                        dbName == "information_schema" ||
                        dbName == "sys" ||
                        dbName == "lost+found" ||
                        dbName == "ndbinfo")
                        continue;

                    result["schemas"][k] = {};
                    result["schemas"][k]["name"] =  dbName;
                    result["schemas"][k]["hostname"] = host.hostName();
                    result["schemas"][k]["port"] = host.port();
                    k++;

                }
            }
        } else {
            print ("Not connected to " + host);
        }
    }

    var pghosts = cluster::postgreSqlNodes();
    pgquery = "SELECT datname FROM pg_database WHERE datistemplate = false";
    for (idx = 0; idx < pghosts.size(); ++idx) {
        host = pghosts[idx];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;

        map = host.toMap();
        connected = map["connected"];
        if (connected) {

            ret = getValueMap(host, pgquery);
            if (ret != false && ret.size() > 0)
            {

                for (i=0; i<ret.size(); ++i)
                {
                    dbName =  ret[i][0];
                    result["schemas"][k] = {};
                    result["schemas"][k]["name"] =  dbName;
                    result["schemas"][k]["hostname"] = host.hostName();
                    result["schemas"][k]["port"] = host.port();
                    k++;
                }
            }
        } else {
            print ("Not connected to " + host);
        }
    }

    exit(result);
}
