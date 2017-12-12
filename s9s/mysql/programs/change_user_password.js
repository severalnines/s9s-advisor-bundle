#include "common/mysql_helper.js"

var DESCRIPTION="Change the password for a mysql user across all available mysql servers.";
// CHANGE ME
var PASSWORD = "mynewpassword";
// CHANGE ME
var USER = "'alex'@'localhost'";
var SQL_SET_PASSWORD = "SET PASSWORD FOR " + USER + " = PASSWORD('" + PASSWORD + "')";

function main()
{
    var hosts     = cluster::mySqlNodes();
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];

        if (connected)
        {
            retval = host.executeSqlCommand(SQL_SET_PASSWORD);
            if (!retval["success"])
            {
                print("ERROR:", retval["errorMessage"]);
                return false;
            }
            else
            {
                print("New password set for " + USER + " on " + host.hostName());
            }
        }
    }
    return true;
}
