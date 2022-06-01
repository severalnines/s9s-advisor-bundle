#include "common/mysql_helper.js"


var DESCRIPTION="This advisor identifies tables that have no explicit primary keys from the information_schema,"
" which is important to have as a unique identifier for each row in a dataset.";


var query1=
    "SELECT * FROM "
"(SELECT TABLE_SCHEMA, TABLE_NAME, INDEX_NAME as REDUNDANT_INDEX,"
" GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS redundant_columns"
" FROM information_schema.STATISTICS"
" WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql',"
" 'performance_schema','ndbinfo','sys')"
" AND NON_UNIQUE = 1 AND INDEX_TYPE='BTREE'"
" GROUP BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME ) AS i1"
" INNER JOIN (SELECT TABLE_SCHEMA, TABLE_NAME, INDEX_NAME,"
" GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns"
" FROM information_schema.STATISTICS"
" WHERE INDEX_TYPE='BTREE'"
" GROUP BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME ) AS i2"
" USING (TABLE_SCHEMA, TABLE_NAME)"
" WHERE i1.redundant_columns != i2.columns"
" AND LOCATE(CONCAT(i1.redundant_columns, ','), i2.columns) = 1";

var query2="SELECT count(table_name)"
" FROM information_schema.tables"
" WHERE table_schema "
"NOT IN ('mysql', 'INFORMATION_SCHEMA','performance_schema', 'ndbinfo', 'sys')";

var MAX_TABLES=1024;
var ANALYZE_ALL_HOSTS = false;

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
            /* We will only run the query on one galera node
     * so we will create only one advice.
     */

    var advice = new CmonAdvice();
    advice.setTitle("Tables with duplicate indexes");
    cmonConfig       = conf::values();
    var exists = cmonConfig.keys().contains("enable_is_queries");

    if (exists)
        if (!cmonConfig["enable_is_queries"].toBoolean())
    {
        advice.setHost(hosts[0]);
        advice.setAdvice("Nothing to do.");
        advice.setSeverity(Ok);
        advice.setJustification("Information_schema queries are not enabled.");
        advisorMap[0]= advice;
        return advisorMap;
    }

    var foundNoPK = false;
    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected   = map["connected"];
        var msg ="";
        if (!connected)
            continue;

        print("   ");
        print(host);
        print("==========================");
        advice.setHost(host);
        var tableCount = getSingleValue(host, query2);

        if (tableCount.toInt() > MAX_TABLES)
        {
            advice.setAdvice("Nothing to do.");
            advice.setSeverity(Ok);
            advice.setJustification("Too many tables to analyze"
                                    " using information_schema.");
            print(advice.toString("%E"));
            advisorMap[idx]= advice;
            if (ANALYZE_ALL_HOSTS)
                continue;
            return advisorMap;
        }
        ret = getValueMap(host, query1);
        if(ret == false || ret.size() == 0)
        {
            advice.setAdvice("Nothing to do.");
            advice.setSeverity(Ok);
            advice.setJustification("No duplicate indexes found.");
            advisorMap[idx]= advice;
            print(advice.toString("%E"));
            host.clearAlarm(MySqlIndexAnalyzer);

            if (ANALYZE_ALL_HOSTS)
                continue;
            return advisorMap;
        }

        justification = "The tables: '";
        print("<table>");
        print("<tr><td width=20%>Table Name</td>"
              "<td width=20%>Schema</td>"
              "<td width=10%>Redundant index</td></tr>");

        for(i=0; i<ret.size(); ++i)
        {
            if( ret[i][0] != "")
            {
                print("<tr><td width=20%>" + ret[i][0] + "</td>"
                      "<td width=20%>" + ret[i][1] + "</td>"
                      "<td width=10%>" + ret[i][2] + "</td></tr>");
                foundNoPK = true;
            }
        }
        print("</table><br/>");

        for(i=0; i<ret.size(); ++i)
        {
            if( ret[i][0] != "")
            {
                justification = justification +  " " + ret[i][0]  + "." + ret[i][1];
                if (i<ret.size()-1)
                    justification = justification +  ",";
            }
        }
        if( foundNoPK )
        {
            justification = justification + "' has redundant indexes.";
            advice.setAdvice("Duplicate indexes use more spaces and may"
                             " slow down writes. Plan carefully if you want to"
                             " remove duplicate indexes.");
            advice.setSeverity(Warning);
            advice.setJustification(justification);
            host.raiseAlarm(MySqlIndexAnalyzer, Warning, justification);

        }
        else
        {
            advice.setAdvice("Nothing to do.");
            advice.setSeverity(Ok);
            advice.setJustification("No duplicate indexes found.");
        }
        advisorMap[idx]= advice;
        print(advice.toString("%E"));
        if (ANALYZE_ALL_HOSTS)
            continue;
        break;
    }
    return advisorMap;
}
