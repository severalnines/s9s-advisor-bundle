#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
* List DB size from the information schema.
* Format:  db hostAndPort
* db: use % for wild card or db name
* hostAndPort : 10.10.10.10.:3306 
*/

var DESCRIPTION="This advisor provides a snapshot of your database by selecting"
                " the total number of rows, data size, index size, total size and"
                " index ratio per database object from information_schema.";

query="SELECT CONCAT(table_schema, '.', table_name) tables, "
"CONCAT(ROUND(table_rows / 1000000, 2), 'M') no_rows,CONCAT(ROUND(data_length / ( 1024 * 1024 ), 2), 'M') DATA, "
"CONCAT(ROUND(index_length / ( 1024 * 1024 ), 2), 'M') idx, "
"CONCAT(ROUND(( data_length + index_length ) / ( 1024 * 1024 ), 2), 'M') total_size, "
"ROUND(index_length / data_length, 2) idxfrac "
"FROM information_schema.TABLES WHERE TABLE_SCHEMA LIKE '@@DB@@' ORDER BY data_length + index_length DESC";

function main(db, hostAndPort) {
    var hosts = cluster::mySqlNodes();
    cmonConfig       = conf::values();
    var exists = cmonConfig.keys().contains("enable_is_queries");    
    if (exists)     
        if (!cmonConfig["enable_is_queries"].toBoolean())
        {
            print("Information_schema queries are not enabled.");
            exit(0);
        }
    
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(!hostMatchesFilter(host,hostAndPort))
            continue;

        if ( db == #N/A)
            db = "%";

        map = host.toMap();
        connected = map["connected"];
        print("   ");
        print(host);
        print("==========================");
        if (connected) {
            query.replace("@@DB@@", db);
            ret = getValueMap(host, query);
            if (ret != false && ret.size() > 0) {
                print("<table><tr>"
                      "<th width=20%>Table</th>"
                      "<th width=10%>Rows</th>"
                      "<th width=10%>Data</th>"
                      "<th width=20%>Index</th>"
                      "<th width=20%>Total size</th>"
                      "<th width=20%>Idx ratio</th>"
                      "</tr>");                
                for (i=0; i<ret.size(); ++i) {
                    print("<tr><td>" + ret[i][0] + "&nbsp;&nbsp;</td>"
                          "<td>" + ret[i][1] + "</td>"
                          "<td>" + ret[i][2] + "</td>"
                          "<td>" + ret[i][3] + "</td>"
                          "<td>" + ret[i][4] + "</td>"
                          "<td>" + ret[i][5] + "</td></tr>");
                }
            }
            print("</table><br/>");
            print("-- " + CmonDateTime::currentDateTime().toString(MySqlLogFileFormat) + " --");
        }
        else {
            print("Not connected");
            continue;
        }
    }
}

