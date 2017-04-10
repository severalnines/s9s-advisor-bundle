#include "common/mysql_helper.js"
#include "cmon/alarms.h"

/*
 * Requires performance_schema (version 5.6)
 * Not beautifully formatted output yet.
 * Based on Mark Leith's example
 * http://www.markleith.co.uk/2012/07/13/monitoring-processes-with-performance-schema-in-mysql-5-6/
 * Prints a detailed processlist
 */
var DESCRIPTION="This advisor selects the MySQL process list on all database servers from the performance_schema and"
                " provides a summary of all running processes across the MySQL server.";
query="SELECT pps.thread_id AS thd_id,"
"       pps.processlist_id AS conn_id,"
"       IF (pps.name = 'thread/sql/one_connection', "
"          CONCAT(pps.processlist_user, '@', pps.processlist_host), "
"          REPLACE(pps.name, 'thread/', '')) user,"
"       pps.processlist_db AS db,"
"       pps.processlist_command AS command,"
"       pps.processlist_state AS state,"
"       pps.processlist_time AS time,"
"       pps.processlist_info AS current_statement,"
"       IF (esc.timer_wait IS NOT NULL,"
"          esc.sql_text,"
"          NULL) AS last_statement,"
"       IF (esc.timer_wait IS NOT NULL,"
"          esc.timer_wait,"
"          NULL) as last_statement_latency,"
"       esc.lock_time AS lock_latency,"
"       esc.rows_examined,"
"       esc.rows_sent,"
"       esc.rows_affected,"
"       esc.created_tmp_tables AS tmp_tables,"
"       esc.created_tmp_disk_tables as tmp_disk_tables,"
"       IF (esc.no_good_index_used > 0 OR esc.no_index_used > 0, "
"          'YES', 'NO') AS full_scan,"
"       ewc.event_name AS last_wait,"
"       IF (ewc.timer_wait IS NULL AND ewc.event_name IS NOT NULL, "
"          'Still Waiting', "
"          ewc.timer_wait) last_wait_latency,"
"       ewc.source"
"  FROM performance_schema.threads AS pps"
"  LEFT JOIN performance_schema.events_waits_current AS ewc USING (thread_id)"
"  LEFT JOIN performance_schema.events_statements_current as esc USING (thread_id)"
    "ORDER BY pps.processlist_time DESC, last_wait_latency DESC;";

var fields="thd_id,conn_id,user,db,command,state,time,current_statement,"
           "last_statement,last_statement_latency,lock_latency_us,"
           "rows_examined,rows_sent,rows_affected,"
           "tmp_tables,tmp_disk_tables,full_scan,last_wait,"
           "last_wait_latency,source";

var hosts     = cluster::mySqlNodes();
var fieldList = fields.split(",");
print("Processlist<br/><br/>");


for (idx = 0; idx < hosts.size(); ++idx)
{
    host        = hosts[idx];
    map         = host.toMap();
    connected     = map["connected"];
    if (!connected)
        continue;
    if (!readVariable(host, "performance_schema").toBoolean())
    {
        print(host, ": performance_schema is not enabled.");
        continue;
    }
    ret = getValueMap(host, query);
    print("Server: ", host);
    print("------------------------");
    if (ret == false)
        print("No data found.");
    else
    {
        for (i=0; i<ret.size(); ++i)
        {
            print("<table cellspacing='1' cellpadding='1'>");
            htmlrow="<tr>";
            htmlrow= htmlrow + "<td>Found on server:</td>";
            htmlrow= htmlrow + "<td>" + host.hostName() + ":" + host.port() + "</td>";
            htmlrow=htmlrow+"</tr>";
            print(htmlrow);
            for (j=0; j<fieldList.size(); j++)
            {
                htmlrow="<tr>";
                htmlrow= htmlrow + "<td>" + fieldList[j] + ":</td>";
                htmlrow= htmlrow + "<td>" + ret[i][j] + "</td>";
                htmlrow=htmlrow+"</tr>";
                print(htmlrow);
            }
            print("<tr><td></td></tr>");
            print("</table>-------------------------------------------"
                  "----------------------------------------------<br/>");
        }
    }
}
