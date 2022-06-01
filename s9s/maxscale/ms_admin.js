/**
 *  This script is used by the MaxScale user interface.
 *  Modifying this script may lead to loss of functionality.
 */

#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/io.h"

var MAXSCALE_HOME="/usr";
var MAXSCALE_BIN=MAXSCALE_HOME + "/bin";
var username = "";
var password = "";
var cmd="";
var hostname="";
var cli_port=6603;
function main(cmd, hostname, cli_port, username, password)
{
    if (cmd.toString() == "" || cmd.toString() == "#N/A" || cmd.empty())
        cmd="list servers";

    if (cli_port.toInt() == 0 || cli_port.toString() == "#N/A" ||
        cli_port.toInt() == 9600 ||
        cli_port.empty())
        cli_port=6603;
    if (hostname.toString() == "" || hostname.toString() == "#N/A" ||
        hostname.empty())
        hostname="";

    if (username.toString() == "" || username.toString() == "#N/A" ||
        username.empty())
        username="admin";

    if (password.toString() == "" || password.toString() == "#N/A" ||
        password.empty())
        password="mariadb";
    var connectstring = "-u" + username + " -p" + password;

    hosts       = cluster::maxscaleNodes();
    var host;
    if (hosts.size() == 0)
    {
        print("(1) No MaxScale Hosts found");
        exit(0);
    }
    var found = false;

    if (hostname.toString() != "")
    {
        for (idx = 0; idx < hosts.size(); idx++)
        {
            host        = hosts[idx];
            if (host.hostName() == hostname.toString())
            {
                if (host.port() == cli_port.toInt())
                {
                    found=true;
                    break;
                }
                // if the port is not there due to CMON-1021:
                if (host.nodeType() == "maxscale")
                {
                    found=true;
                    break;
                }
            }
        }
        if (!found)
        {
            print("(2) No MaxScale Hosts found");
            exit(0);
        }
    }
    else
    {
        host        = hosts[0];
    }
    //older maxscales:
    if(checkHostVersion(host, "2.0") || checkHostVersion(host,"2.1") || checkHostVersion(host, "1."))
    {
        connectstring = connectstring + " -P" + cli_port;
        cmdline = MAXSCALE_BIN + "/maxadmin " + connectstring + " -e '" + cmd + "'";
    }
    else
    {
        connectstring = "-u " + username + " -p " + password;
        cmdline = MAXSCALE_BIN + "/maxctrl " + connectstring  +  " " + cmd  + " | sed -r 's/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[mGK]//g'";
    }
    retval = host.system(cmdline);
    print("["+ host.hostName() + ":" + host.port() +  "] MaxScale> " +  cmd + "");
    var dateTime = CmonDateTime::currentDateTime();

    if (!retval["success"])
    {
        error("ERROR: ", retval["errorMessage"]);
        exit(1);
    }
    var str = retval["result"];

    print(str);
    print("Execution finished at " +
          dateTime.toString(EmailDateTimeFormat));
    exit(retval);
}




