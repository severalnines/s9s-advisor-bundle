#include "common/mysql_helper.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor selects the top 10 most frequently accessed files by MySQL and"
                " shows you the number of times accessed and total time from performance_schema.";
query="SELECT file_name, count_star,"
      " sum_timer_wait/1000000000 wait_s"
      " FROM performance_schema.file_summary_by_instance"  
      " ORDER BY 3 DESC LIMIT 10";

var hosts     = cluster::mySqlNodes();
print("Top 10 Accessed DB files<br/><br/>");

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
        print("<table>");
        print("<tr><td width=20%>Filename</td>"
              "<td width=20%>No of accesses</td>"
              "<td width=20%>Total time (s)</td></tr>");
        for (i=0; i<ret.size(); ++i)
        {
            print("<tr><td width=20%>" + ret[i][0] + "</td>"
                  "<td width=20%>" + ret[i][1] + "</td>"
                  "<td width=20%>" + ret[i][2] + "</td></tr>");
        }
        print("</table><br/>");
    }
}
