#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor selects the top 5 queries, sorted by execution count, from performance_schema." ;
query="select (count_star/(select sum(count_star) FROM"
" performance_schema.events_statements_summary_by_digest) * 100) as pct,"
" count_star,left(digest_text,150) as stmt "
" from performance_schema.events_statements_summary_by_digest"
" order by 1 desc limit 5";

function main()
{
    var hosts     = cluster::mySqlNodes();
    print("Top 5 Queries per Server");
    print("  ");
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        msg = "";
        var advice = new CmonAdvice();
        advice.setHost(host);
        advice.setTitle("Top Queries");

        if(!connected)
            continue;
        if (!readVariable(host, "performance_schema").toBoolean())
        {
            advice.setAdvice("No data to analyze.");
            advice.setJustification("performance_schema is not enabled.");
            advice.setSeverity(Ok);
            advisorMap[idx]= advice;
            print(host, ": performance_schema is not enabled.");
            continue;
        }
        if (isMySql55Host(host))
        {
            advice.setJustification("´This advisor is not support on MySQL/MariaDb 5.5.");
            advice.setSeverity(Ok);
            advice.setAdvice("No advise.");
            advisorMap[k++]= advice;
            continue;
        }
        ret = getValueMap(host, query);
        print("Server: ", host);
        print("------------------------");
        if(ret == false)
        {
            advice.setAdvice("No advise");
            advice.setSeverity(Ok);
            advice.setJustification("Failed to read data from server.");
            advisorMap[idx]= advice;
            continue;
        }
        else
        {
            msg=concatenate(msg, "<table>");
            msg=concatenate(msg, "<tr><td width=20%>Percent</td>"
                            "<td width=20%>ExecCount</td>"
                            "<td width=60%>Query</td></tr>");

            for(i=0; i<ret.size(); ++i)
            {
                psQuery = ret[i][2];
                if (len(psQuery) > 512)
                {
                    psQuery = left(psQuery, 512);
                    psQuery = psQuery + "...truncated";
                }
                msg= concatenate(msg, "<tr><td width=20%>" + round(ret[i][0].toDouble(),2) + "</td>"
                                 "<td width=20%>" + ret[i][1] + "</td>"
                                 "<td width=60%>" + psQuery + "</td></tr>");
                             /*   msg = concatenate(msg, 
                             "Pct :  ",  round(ret[i][0].toDouble(),2), "%",
                             ", Exec Count: ", ret[i][1],
                             ", ", ret[i][2], "<br/>");*/

            }
            msg=concatenate(msg,"</table><br/>");
            if (msg != "")
            {
                advice.setAdvice("Top 5 Queries.");
                advice.setJustification(msg);
                advice.setSeverity(Ok);
                advisorMap[idx]= advice;
            }
            print(msg);
        }
    }
    return advisorMap;
}
