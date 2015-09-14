#include "common/mysql_helper.js"

/**
 * Sets a config variable (set global + update the my.cnf)
 * 10.10.10.15 mysqld max_connections 512
 */

function main(hostlist, section, key, newValue)
{
    var hosts     = cluster::mySqlNodes();
    var result = {};
    
    if (hostlist == #N/A || 
        section == #N/A ||
        key == #N/A ||
        newValue == #N/A)
    {
        result["success"] = false;

        result["errorMessage"] = "Wrong arguments.";
        exit(result);
    }
    
    var changeHostsArray = hostlist.split(",");
    var hostName = "";
    var found;
    for (i = 0; i < changeHostsArray.size(); i++)
    {
        found = false;
        hostName = changeHostsArray[i];
        
        for (idx = 0; idx < hosts.size(); ++idx)
        {
            host        = hosts[idx];
            if( host.hostName() != hostName )
                continue;
            else
            {
                map         = host.toMap();
                connected     = map["connected"];
                found  = true;
                break;
            }
        }    
        if (!found)
            continue;
        
        result[i]={};
        result[i]["result"] = {};
        result[i]["result"]["hostname"] = hostName;
        
        if (connected)
        {
            var oldValue = readVariable(host, key);
            if (oldValue  == false)
            {
                result[i]["result"]["success"] = false ; 
                result[i]["result"]["errorMessage"] = host.hostName() + ":" + 
                                                      host.port() + 
                                                      ": Variable " + 
                                                      key.toString() + 
                                                      " not found.";
                continue;   
            }
            if (oldValue.toString() == newValue.toString())
            {
                result[i]["result"]["success"] = true; 
                result[i]["result"]["errorMessage"] = host.hostName() + ":" + 
                                                      host.port() + 
                                                    ": Ignoring change of " + 
                                                    key + ", since " + 
                                                    newValue  + 
                                                    " = (current " + 
                                                    oldValue + ").";
                continue;
            }
            result[i]["result"]["restartNeeded"] = false; 

            retval = setGlobalVariable2(host,key, newValue);
            if (!retval["success"])
            {
                errorMsg = retval["errorMessage"].toString();
                if (errorMsg.contains("read only variable"))
                {
                    result[i]["result"]["success"] = true; 
                    result[i]["result"]["restartNeeded"] = true; 
                }
                else
                {
                   result[i]["result"]["success"] = retval["success"];
                   result[i]["result"]["errorMessage"] = retval["errorMessage"];
                   print(retval["errorMessage"]);
                   return false;
                }
            }
             result[i]["result"]["errorMessage"] = host.hostName() + 
                       ":" + host.port() + ": Setting " + 
                       key + "=" + newValue  + 
                       " (previous = " + oldValue + ") in configuration file.";
             var config      = host.config();
             value = config.setVariable(section, key, newValue);
             config.save();
             result[i]["result"]["success"] = true; 
        }
        else
        {
            result[i]["result"]["errorMessage"] = host.hostName() + ":" + 
                                                  host.port() + " :  not connected.";
            result[i]["result"]["success"] = true; 
        }
    }
    return result;
}

