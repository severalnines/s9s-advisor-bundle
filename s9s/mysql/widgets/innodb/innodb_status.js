#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * show engine innodb status
 * Format:  hostAndPort
 * hostAndPort : * for all hosts or 10.10.10.10:3306 
 */


function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var result={};
    result["innodb_status"] = {};

    var hosts = cluster::mySqlNodes();
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(hostAndPort != "*" && !hostMatchesFilter(host,hostAndPort))
            continue;

        result["innodb_status"][idx] = {};
        result["innodb_status"][idx]["host"]={};
        result["innodb_status"][idx]["host"]["hostname"] = host.hostName();
        result["innodb_status"][idx]["host"]["port"] = host.port();

        map = host.toMap();
        connected = map["connected"];
        if (connected) {
            ret = getValueMap(host, "SHOW ENGINE INNODB STATUS");
            ret = getValueMap(host, "SELECT SLEEP(2)");
            ret = getValueMap(host, "SHOW ENGINE INNODB STATUS");

            if (ret != false && ret.size() > 0)
            {
                print("<table><tr>"
                      "<th>InnoDb Status on " + host.toString() + "</th>"
                      "</tr>");                
                for (i=0; i<ret.size(); ++i)
                {
                    result["innodb_status"][idx][i] =  ret[i][2];
                    print("<tr><td>" + ret[i][2] + "&nbsp;&nbsp;</td>"
                          "</td></tr>");
                }
            }
            else
            {
               result["innodb_status"][idx][i] = "No data";
            }
            print("</table>");
            print("-- " + CmonDateTime::currentDateTime().toString(MySqlLogFileFormat) + " --");
        } else {
            print ("Not connected to " + host);
        }
    }
    exit(result);
}
