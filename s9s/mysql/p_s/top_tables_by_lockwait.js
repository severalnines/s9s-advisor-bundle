#include "common/mysql_helper.js"
#include "cmon/alarms.h"

 
query="SELECT object_schema, object_name, count_star, sum_timer_wait"
       " FROM performance_schema.table_lock_waits_summary_by_table"
    " ORDER BY 4 DESC LIMIT 10";

var hosts     = cluster::mySqlNodes();
print("Top 10 Tables by Lock Wait Per Server<br/><br/>");

for (idx = 0; idx < hosts.size(); ++idx)
{
    host        = hosts[idx];
    map         = host.toMap();
    connected     = map["connected"];
    if (!connected)
        continue;
    ret = getValueMap(host, query);
    print("Server: ", host);
    print("------------------------");
    if (ret == false)
        print("No data found.");
    else
    {
        print("<table>");
        print("<tr><td width=20%>Schema</td><td width=20%>Table</td>"
              "<td width=20%>No of accesses</td>"
              "<td width=20%>Sum Lock Wait</td></tr>");
        for (i=0; i<ret.size(); ++i)
        {
            print("<tr><td width=20%>" + ret[i][0] + "</td>"
                  "<td width=20%>" + ret[i][1] + "</td>"
                  "<td width=20%>" + ret[i][2] + "</td>"
                  "<td width=20%>" + ret[i][3] + "</td></tr>");
        }
        print("</table><br/>");
    }
}
