#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * List tables for a specified db.
 * Format:  db hostAndPort
 * db: schema name or wildcard
 * hostAndPort : * for all hosts or 10.10.10.10:3306 
 */

query="select TABLE_NAME from INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA LIKE '%@@SCHEMA_NAME@@%' ORDER BY TABLE_NAME ASC";

function main(db, hostAndPort) {
    if (db == #N/A)
        db = "";

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var result={};
    result["tables"] = {};

    var hosts = cluster::mySqlNodes();
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;

        result["tables"][idx] = {};
        result["tables"][idx]["host"]={};
        result["tables"][idx]["host"]["hostname"] = host.hostName();
        result["tables"][idx]["host"]["port"] = host.port();

        map = host.toMap();
        connected = map["connected"];
        if (connected) {
            query.replace("@@SCHEMA_NAME@@", db);            
            ret = getValueMap(host, query);

            if (ret != false && ret.size() > 0)
            {
                print("<table><tr>"
                      "<th>" + db + " tables on " + host.toString() + "</th>"
                      "</tr>");                
                for (i=0; i<ret.size(); ++i)
                {
                    result["tables"][idx][i] =  ret[i][0];
                    print("<tr><td>" + ret[i][0] + "&nbsp;&nbsp;</td>"
                          "</td></tr>");
                }
                result["tables"][idx]["table_cnt"] =  ret.size();
                result["tables"][idx]["schema"] =  db;               
            }
            print("</table>");
            print("-- " + CmonDateTime::currentDateTime().toString(MySqlLogFileFormat) + " --");
        } else {
            print ("Not connected to " + host);
        }
    }
    exit(result);
}
