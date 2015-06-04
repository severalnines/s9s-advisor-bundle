#include "common/mysql_helper.js"


/**
 * Check if there are any MYISAM tables
 * This should be executed as an Advisor every day, or run manually
 * when a schema change has been made.
 */
 
var WARNING_THRESHOLD=4;

query= "SELECT table_schema, table_name, engine"
       " FROM information_schema.tables"
       " WHERE table_schema NOT IN ('mysql', 'INFORMATION_SCHEMA',"
    " 'performance_schema') AND engine = 'MyISAM'";

function main()
{
    var hosts     = cluster::mysqlNodes();
    var advisorMap = {};
    /* We will only run the query on one galera node 
     * so we will create only one advice.
     */
     
    var advice = new CmonAdvice();
    advice.setTitle("MyISAM Tables");
        
    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected   = map["connected"];
        var msg ="";
        
        if (!connected)
            continue;
        
        advice.setHost(host);
    
        ret = getValueMap(host, query);
        if(ret == false || ret.size() == 0)
        {
            advice.setAdvice("Nothing to do. There are no MYISAM tables.");
            advice.setSeverity(Ok);
            advice.setJustification("No MYISAM table has been detected.");
            break;
        }

        justification = "The tables: '";
        print("<table>");
        print("<tr><td width=20%>Table Name</td>"
              "<td width=20%>Schema</td>"
              "<td width=20%>Engine</td>"
              "<td width=40%>Recommendation</td></tr>");

        for(i=0; i<ret.size(); ++i)
        {
            print("<tr><td width=20%>" + ret[i][0] + "</td>"
                  "<td width=20%>" + ret[i][1] + "</td>"
                  "<td width=20%>" + ret[i][2] + "</td>"
                  "<td width=40%>Change to ENGINE = INNODB.</td></tr>");
        }
        print("</table><br/>");
        for(i=0; i<ret.size(); ++i)
        {
            justification = justification +  " " + ret[i][0]  + "." + ret[i][1];
        }
        justification = justification + "' are MYISAM tables.";
        advice.setAdvice("Change engine to InnoDB.");
        advice.setSeverity(Warning);
        advice.setJustification(justification);
    
        advisorMap[idx]= advice;
        break;
    }
    return advisorMap;
}
