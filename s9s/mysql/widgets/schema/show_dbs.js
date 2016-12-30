#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * List schemas grouped by host.
 * Format:  hostAndPort
 * hostAndPort : * for all hosts or 10.10.10.10:3306 
 */

query="select SCHEMA_NAME from INFORMATION_SCHEMA.SCHEMATA "
      " WHERE SCHEMA_NAME NOT IN "
      " ('information_schema', 'performance_schema', 'ndbinfo')"
      " ORDER BY SCHEMA_NAME ASC";

function main(hostAndPort) {
    var hosts = cluster::mySqlNodes();
    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var result={};
    result["schemas"] = {};
    var k = 0;
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;

        result["schemas"][k] = {};
        result["schemas"][k]["host"]={};
        result["schemas"][k]["host"]["hostname"] = host.hostName();
        result["schemas"][k]["host"]["port"] = host.port();

        map = host.toMap();
        connected = map["connected"];
        if (connected) {
            ret = getValueMap(host, query);
            if (ret != false && ret.size() > 0)
            {
                print("<table><tr><th>Schemas on " + host.toString() + 
                "</th></tr>");
                for (i=0; i<ret.size(); ++i)
                {
                    result["schemas"][k][i] =  ret[i][0];
                    print("<tr><td>" + ret[i][0] + "&nbsp;&nbsp;</td>"
                          "</td></tr>");
                }
                result["schemas"][k]["schema_cnt"] =  ret.size();
            }
            print("</table>");
            print("-- " + CmonDateTime::currentDateTime().toString(MySqlLogFileFormat) + " --");
        } else {
            print ("Not connected to " + host);
        }
        k++;
    }
    exit(result);
}

