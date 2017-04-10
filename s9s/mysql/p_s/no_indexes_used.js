#include "common/mysql_helper.js"

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

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();

        if(!connected)
            continue;
        if (!readVariable(host, "performance_schema").toBoolean())
        {
            advice.setHost(host);
            advice.setTitle(TITLE);
            advice.setAdvice("Nothing to check.");
            advice.setJustification("performance_schema is not enabled");
            advisorMap[idx]= advice;
            print(host, ": performance_schema is not enabled.");
            continue;
        }
        result = getValueMap(host, query);
        msg = concatenate("Server: ", host, "<br/>");
        msg = concatenate(msg, "------------------------<br/>");
        if (result == false)
        {
            msg = concatenate(msg, "No tables have been queried without indexes.");
            advice.setJustification(ADVICE_OK);
            advice.setSeverity(Ok);
        }
        else
        {
            for (i=0; i<result.size(); ++i)
            {
                msg = concatenate(msg, "Table has been queried without using indexes: ", result[i][0], ".", result[i][1], " with a total of ", result[i][2], " IO operations (", result[i][3], " Read / ", result[i][4]," Write / ", result[i][5], " Delete)<br/><br/>");
            }
            advice.setJustification(ADVICE_WARNING);
            advice.setSeverity(Warning);
        }
        
        print(msg);
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[idx]= advice;
    }
    return advisorMap;
}
