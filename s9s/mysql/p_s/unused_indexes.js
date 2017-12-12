#include "common/mysql_helper.js"

var DESCRIPTION="This advisor selects the unused existing indexes from performance_schema"
                " to allow you to remove the unused indexes which improves the schema and overall performance.";
var TITLE="Unused indexes";
var ADVICE_WARNING="Unused indexes have been found in your cluster. It is advised to drop them.";
var ADVICE_OK="No unused indexes found.";

var query="SELECT `object_schema` AS `schema`, `object_name` AS `table`, `index_name` AS `index`"
"FROM `performance_schema`.`table_io_waits_summary_by_index_usage` "
"WHERE `index_name` IS NOT NULL "
"AND `count_star` = 0 "
"AND `object_schema` != 'mysql' "
"AND `index_name` != 'PRIMARY'";

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
    k = 0;
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
            advice.setSeverity(Ok);
            advice.setAdvice("No advice.");
            advice.setJustification("performance_schema is not enabled.");
            advisorMap[k++]= advice;
            print(host, ": performance_schema is not enabled.");
            continue;
        }
        result = getValueMap(host, query);
        msg = concatenate("Server: ", host, "<br/>");
        msg = concatenate(msg, "------------------------<br/>");
        if (result == false)
        {
            msg = concatenate(msg, "No unused indexes found on this host.");
            advice.setAdvice(ADVICE_OK);
            advice.setSeverity(Ok);
        }
        else
        {
            for (i=0; i<result.size(); ++i)
            {
                msg = concatenate(msg, "Unused index found on table ", 
                                  result[i][0], ".", 
                                  result[i][1], ": index ", 
                                  result[i][2], " can be dropped.<br/><br/>");
            }
            advice.setAdvice(ADVICE_WARNING);
            advice.setSeverity(Warning);
        }
        
        print(msg);
        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setJustification(msg);
        advisorMap[k++]= advice;
    }
    return advisorMap;
}
