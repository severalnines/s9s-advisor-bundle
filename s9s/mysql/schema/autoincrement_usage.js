#include "common/mysql_helper.js"


var DESCRIPTION="This advisor identifies tables that have no explicit primary keys from the information_schema,"
" which is important to have as a unique identifier for each row in a dataset.";


var query1=
    "SELECT t.TABLE_SCHEMA, t.TABLE_NAME, c.COLUMN_NAME, t.AUTO_INCREMENT,"
" c.COLUMN_TYPE FROM  INFORMATION_SCHEMA.TABLES AS t"
"  LEFT JOIN INFORMATION_SCHEMA.COLUMNS as c ON "
"(t.TABLE_NAME = c.TABLE_NAME) WHERE c.EXTRA='auto_increment'";


var query2="SELECT count(table_name)"
" FROM information_schema.tables"
" WHERE table_schema "
"NOT IN ('mysql', 'INFORMATION_SCHEMA','performance_schema', 'ndbinfo', 'sys')";

var MAX_TABLES=1024;
var ANALYZE_ALL_HOSTS = false;
var DATATYPES = {};

DATATYPES["tinyint"] = 127;
DATATYPES["tinyint unsigned"] = 255;
DATATYPES["smallint"] = 32767;
DATATYPES["smallint unsigned"] = 65535;
DATATYPES["mediumint"] = 8388607;
DATATYPES["mediumint unsigned"] = 16777215;
DATATYPES["int"] = 2147483647;
DATATYPES["int unsigned"] = 4294967295;
// these are highly unlikely
DATATYPES["bigint"] = 1.8446744e+19;
DATATYPES["bigint unsigned"] = 9.223372e+18;
AUTO_INCREMENT_THRESHOLD_WARNING = 30;
AUTO_INCREMENT_THRESHOLD_CRITICAL = 95;
function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
                /* We will only run the query on one galera node
     * so we will create only one advice.
     */

    var advice = new CmonAdvice();
    advice.setTitle("Auto_increment usage");
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
        advice.setSeverity(Ok);

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
            advice.setJustification("No tables with auto_increment found.");
            advisorMap[idx]= advice;
            print(advice.toString("%E"));
            host.clearAlarm(MySqlIndexAnalyzer);

            if (ANALYZE_ALL_HOSTS)
                continue;
            return advisorMap;
        }

        justification = "The tables: ";
        print("<table>");
        print("<tr><td width=20%>Schema</td>"
              "<td width=20%>Table Name</td>"
              "<td width=10%>Column Name</td>"
              "<td width=10%>Auto Inc</td>"
              "<td width=10%>Data Type</td>"
              "<td width=10%>Used</td>"
              "</tr>");

        foundCrit = false;
        foundWarn = false;
        for(i=0; i<ret.size(); ++i)
        {
            if( ret[i][0] != "")
            {
                schema = ret[i][0];
                table = ret[i][1];
                column = ret[i][2];
                autoIncValue = ret[i][3];
                dataType = ret[i][4];
                var regex = /\(.*\)/i;
                dataType.replace(regex,"");
                used = round(100 * (autoIncValue /  DATATYPES[dataType]),0);
                if(used >= AUTO_INCREMENT_THRESHOLD_WARNING &&
                   used < AUTO_INCREMENT_THRESHOLD_CRITICAL)
                {
                    foundWarn = true;
                    if (!foundCrit)
                        advice.setSeverity(Warning);
                }
                else if ( used > AUTO_INCREMENT_THRESHOLD_CRITICAL)
                {
                    foundCrit = true;
                    advice.setSeverity(Critical);
                }
                else
                {
                    continue;
                }
                justification += schema + "." + table + "(" + column + ", " + dataType + ")"
                    + " uses " + used + "% of the maximum available auto_increments.<br/>";
                print("<tr><td width=20%>" + schema + "</td>"
                      "<td width=20%>" + table + "</td>" +
                      "<td width=10%>" + column + "</td>"+
                      "<td width=10%>" + autoIncValue + "</td>"+
                      "<td width=10%>" + dataType + "</td>"+
                      "<td width=10%>" + used + "</td>"+
                      "</tr>");
            }
        }
        print("</table><br/>");
        if (!foundCrit && !foundWarn)
        {
            advice.setAdvice("Nothing to do.");
            advice.setJustification("Auto_increments are within boundaries.");
            advice.setSeverity(Ok);
        }
        else
        {
            advice.setAdvice("Consider changing data types, you are running low on auto_increments.");
            advice.setJustification(justification);
            host.raiseAlarm(MySqlAutoIncrementAnalyzer, Warning, justification);
        }


        advisorMap[idx]= advice;
        print(advice.toString("%E"));
        if (ANALYZE_ALL_HOSTS)
            continue;
        break;
    }
    return advisorMap;
}
