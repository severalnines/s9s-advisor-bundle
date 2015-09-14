#include "common/mysql_helper.js"

/**
 * Sets a config variable (set global + update the my.cnf)
 */

var VARIABLE="query_cache_type";
var VALUE=0;
var FORCE=1;
function main()
{
    var hosts     = cluster::galeraNodes();
    var advisorMap = {};

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
    
        if (connected)
        {
            var value = readVariable(host, VARIABLE);
            if (value  == false)
            {
                print(host.hostName() + ":" + host.port() + 
                      ": Variable " + VARIABLE + " not found.");
                continue;   
            }
            if (value.toString() == VALUE.toString())
            {
                print(host.hostName() + ":" + host.port() + ": Ignoring change of " + 
                        VARIABLE + ", since " + VALUE  + " = (current " + value + ").");
                continue;
            }
            retval = setGlobalVariable(host,VARIABLE, 
                                          VALUE);
            if (retval["success"] || FORCE)
            {
                print(host.hostName() + ":" + host.port() + ": Setting " + 
                       VARIABLE + "=" + VALUE  + 
                       " (previous = " + value + ") in configuration file.");
                var config      = host.config();
                value = config.setVariable("MYSQLD", VARIABLE, VALUE);
                config.save();
            }
            else
            {
                print(host.hostName() + ":" + host.port() + 
                      ": Failed to set " + VARIABLE + "=" + VALUE  + ".");
                print(host, ": Failed due to: " + retval["errorMessage"]);
            }
        }
        else
        {
            print(host.hostName() + ":" + host.port() + " :  not connected.");
        }
    }
    return true;
}

