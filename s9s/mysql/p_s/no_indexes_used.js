#include "common/mysql_helper.js"
#include "common/helpers.js"


var DESCRIPTION="This advisor selects all tables being accessed without using an index from performance_schema"
" to show you where to improve the queries running against these tables.";
var TITLE="Table access without using index";
var ADVICE_WARNING="There has been access to tables without using an index. Please investigate queries using these tables using a query profiler.";
var ADVICE_OK="All tables have been accessed using indexes.";

var query = "SELECT `object_schema`, `object_name`, `count_star`, `count_read`, "
"`count_write`, `count_delete` "
"FROM performance_schema.table_io_waits_summary_by_index_usage "
"WHERE index_name IS NULL "
"AND count_star > 0 "
"AND object_schema != 'mysql'";

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
    k=0;
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();
        advice.setHost(host);
        advice.setTitle(TITLE);
        if(!connected)
            continue;
        if (!readVariable(host, "performance_schema").toBoolean())
        {
            advice.setJustification("performance_schema is not enabled.");
            advice.setSeverity(Ok);
            advice.setAdvice("No advice.");
            advisorMap[k++]= advice;
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
        result = getValueMap(host, query);
        msg = concatenate("Server: ", host, "<br/>");
        msg = concatenate(msg, "------------------------<br/>");
        if (result == false)
        {
            msg = concatenate(msg, "Failed to read data from server.");
            advice.setAdvice("No advise");
            advice.setSeverity(Ok);
            advice.setJustification(msg);
            advisorMap[k++]= advice;
            continue;
        }
        else
        {
            for (i=0; i<result.size(); ++i)
            {
                msg = concatenate(msg, "Table has been queried without using indexes: ",
                                  result[i][0], ".",
                                  result[i][1], " with a total of ",
                                  result[i][2], " IO operations (",
                                  result[i][3], " Read / ",
                                  result[i][4]," Write / ",
                                  result[i][5], " Delete)<br/><br/>");
            }
            advice.setAdvice(ADVICE_WARNING);
            advice.setSeverity(Warning);
        }
        print(msg);
        advice.setJustification(msg);
        advisorMap[k++]= advice;
    }
    return advisorMap;
}


