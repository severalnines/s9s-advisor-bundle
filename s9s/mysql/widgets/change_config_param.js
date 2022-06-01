#include "common/mysql_helper.js"

/**
 * Sets a config variable (set global + update the my.cnf)
 * 10.10.10.15 mysqld max_connections 512
 */

function main(hostlist, section, key, newValue)
{
    var hosts     = cluster::hosts();
    var result = {};
    var key = lower(key);

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
    var msg = "";
    var found;
    var passed;
    var keyForSetGlobal = "";
    keyForSetGlobal = key;
    keyForSetGlobal.replace("loose_", "");

    for (i = 0; i < changeHostsArray.size(); i++)
    {
        found = false;
        msg = "";
        passed = "";
        hostAndPort = changeHostsArray[i];
        hostAndPortArr = hostAndPort.split(":");
        hostName = hostAndPortArr[0];
        port = hostAndPortArr[1];
        for (idx = 0; idx < hosts.size(); ++idx)
        {
            host        = hosts[idx];
            if( host.hostName() != hostName && host.port() !=port )
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
        result[i]["result"]["restartNeeded"] = false;
        mysqldSection = false;
        if (section.toUpperCase() == "MYSQLD" ||
            section.toUpperCase() == "SERVER" ||
            section.toUpperCase() == "MARIADB")
        {
            mysqldSection = true;
        }
        // a better test is needed here, since what we really want to check
        // is if the host is reachable from ssh.
                /*        if (!connected)
        {
            result[i]["result"]["success"] = false ;
            result[i]["result"]["errorMessage"] = host.hostName() + ":" +
                                                          host.port() +
                                                          " is not reachable." +
                                                          " Skipping this server";
            continue;
        }
                */
        var oldValue = "";
        if (mysqldSection && connected)
        {

            oldValue = readVariable(host, keyForSetGlobal);
            if (oldValue  == false)
            {
                result[i]["result"]["success"] = false ;
                result[i]["result"]["errorMessage"] = host.hostName() + ":" +
                    host.port() +
                    ": Variable " +
                    keyForSetGlobal.toString() +
                    " not found.";
                continue;
            }
            if (oldValue.toString() == newValue.toString())
            {
                result[i]["result"]["success"] = true;
                result[i]["result"]["errorMessage"] = host.hostName() + ":" +
                    host.port() +
                    ": Ignoring change of " +
                    keyForSetGlobal + ", since " +
                    newValue  +
                    " = (current " +
                    oldValue + ").";
                continue;
            }
        }
        var setglobal = false;
                        /*
        blackListed = isBlackListed(key, newValue);
        if(blackListed)
            result[i]["result"]["restartNeeded"] = true;
                        */

        if (mysqldSection && connected)
        {
            retval = setGlobalVariable(host,keyForSetGlobal, newValue);
            if (!retval["success"])
            {
                errorMsg = retval["errorMessage"].toString();
                if (errorMsg.contains("read only variable"))
                {
                    result[i]["result"]["success"] = true;
                    result[i]["result"]["restartNeeded"] = true;
                }
                else if (errorMsg.contains("Incorrect arguments to SET"))
                {
                    result[i]["result"]["success"] = true;
                    result[i]["result"]["restartNeeded"] = true;
                }
                else
                {
                    result[i]["result"]["success"] = retval["success"];
                    result[i]["result"]["errorMessage"] = retval["errorMessage"];
                    print(retval["errorMessage"]);
                    continue;
                }
            }
            else
            {
                setglobal = true;
            }
        }
        msg = host.hostName()
            + ":" + host.port() + ": Successfully changed"
            + " and set "
            + key + "=" + newValue  + " in section [" + section  + "].<br/>";
        if (mysqldSection)
            msg = msg + " Previous value was " + oldValue + ".<br/>";

        var config      = host.config();
        error  = config.errorMessage();

        value = config.setVariable(section, key, newValue);
        config.save();

        if (result[i]["result"]["restartNeeded"]  || !connected)
        {
            msg = msg + " The change has been persisted in the config file.<br/>";
            msg = msg + " <b>A restart of the DB node is required for the"
                + " change to take effect</b>.";
            if (!connected)
                result[i]["result"]["restartNeeded"] = true;
        }
        else
        {
            if (setglobal)
                msg = msg + " The change has been persisted in the config file"
                + " and successfully set with SET GLOBAL.<br/>"
                + "<b>No DB node restart is required</b>.";
            else
                msg = msg + " The change has been persisted in the config file.<br/>"
                + "<b>No DB node restart is required</b>.";
        }
        result[i]["result"]["errorMessage"] = msg;
        if(error != "Success.")
        {
            result[i]["result"]["success"] = false;
            result[i]["result"]["errorMessage"] = error;
        }
        else
        {
            var job = CmonJob::createImportConfigJob();
            passed = job.enqueue();
            result[i]["result"]["success"] = true;
        }
    }

    return result;
}

function isBlackListed(key, value)
{
    if (key == "wsrep_provider_options")
    {
        if (value.contains("gmcast.segment"))
            return true;
    }
    else if (key == "gtid_mode")
    {
        return true;
    }

    return false;
}

