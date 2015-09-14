#include "common/mysql_helper.js"
#include "cmon/alarms.h"

 
query="select (count_star/(select sum(count_star) FROM"
      " performance_schema.events_statements_summary_by_digest) * 100) as pct,"
        " count_star,left(digest_text,150) as stmt "
        " from performance_schema.events_statements_summary_by_digest"
        " order by 1 desc limit 10";


var hosts     = cluster::mySqlNodes();
print("Top 10 Queries per Server");
print("  ");
for (idx = 0; idx < hosts.size(); ++idx)
{
    host        = hosts[idx];
    map         = host.toMap();
    connected     = map["connected"];
    if(!connected)
        continue;
    if (!readVariable(host, "performance_schema").toBoolean())
    {
        print(host, ": performance_schema is not enabled.");
        continue;
    }
    ret = getValueMap(host, query);
    print("Server: ", host);
    print("------------------------");
    if(ret == false)
        print("No queries found.");
    else
    {
        print("<table>");
        print("<tr><td width=20%>Percent</td>"
              "<td width=20%>ExecCount</td>"
              "<td width=60%>Query</td></tr>");

        for(i=0; i<ret.size(); ++i)
        {
            print("<tr><td width=20%>" + round(ret[i][0].toDouble(),2) + "</td>"
                  "<td width=20%>" + ret[i][1] + "</td>"
                  "<td width=60%>" + ret[i][2] + "</td></tr>");
        }
        print("</table><br/>");
    }
}

