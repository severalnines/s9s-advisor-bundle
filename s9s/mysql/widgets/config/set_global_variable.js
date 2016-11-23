#include "common/helpers.js"
#include "common/mysql_helper.js"
#include "cmon/io.h"

/**
 * 
 * Format:  hostAndPort  variable value
 * hostAndPort : e.g 10.10.10.10:3306
 * variable: string
 * value: string
 */


function main(hostAndPort, variable, value) {
    var result;
    if (hostAndPort == #N/A)
        exit(false);
        
    if (variable == #N/A )
    {
        exit(false);
    }
    if (value == #N/A )
    {
        exit(false);
    }

    var hosts = cluster::mySqlNodes();
    
    for (idx = 0; idx < hosts.size(); ++idx) {
        host = hosts[idx];
        if(!hostMatchesFilter(host,hostAndPort))
            continue;
        map = host.toMap();
        connected = map["connected"];
        if (connected)
        {
            result = setGlobalVariable(host, variable, value);
            if (result["success"] == false)
            {
                print("failed: ", result["errorMessage"]);    
            
            }
            else
            {
                print("success: 'SET GLOBAL ", variable, " = ", value, "'");    
            }
            exit(result);
        }
    }
    exit(false);
}
