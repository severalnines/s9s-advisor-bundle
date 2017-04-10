#include "common/mysql_helper.js"

var DESCRIPTION="This advisor creates a MySQL logrotate configuration file under"
                " /etc/logrotate.d/mysql on every MySQL server which prevents your MySQL error log from growing out of hand.";
ROOT_PASSWORD='password';
ROOT_USER='root';

function main()
{
    var hosts     = cluster::mySqlNodes();
    if(ROOT_PASSWORD == '')
    {
        print("ROOT_PASSWORD is not set.");
        return false;
    }
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();
            
        if(!connected)
        {
            print("Instance " + host.hostName() + ":" + host.port() + " is not online");
            continue;    
        }
        var error_log = readVariable(host, "log_error");

        var log_rotate_conf=error_log + "{;"
"        create 600 mysql root;" +
"        notifempty;"
"        daily;"
"        rotate 5;"
"        missingok;"
"        compress;"
"        postrotate;"
            "     # just if mysqld is really running;"
            "    if test -x /usr/bin/mysqladmin &&  /usr/bin/mysqladmin ping &>/dev/null;"
"        then;"
"            /usr/bin/mysqladmin flush-logs;"
"        fi;"
"        endscript;"
            "};";
        /* write to /tmp and change ; to newline */
        cmd = "echo '" + log_rotate_conf + "' |  tr @@2SLASH; @@3SLASHn > /tmp/mysql_log_rotate_conf" ; 
        cmd.replace("@@2SLASH","\\");
        cmd.replace("@@3SLASH","\\\\");
        print(cmd);
        var retval = host.system(cmd);
        if (!retval["success"])
        {
            error("ERROR: ", retval["errorMessage"]);
        }
        /* move in place */
        cmd = "mv /tmp/mysql_log_rotate_conf /etc/logrotate.d/mysql" ; 
        retval = host.system(cmd);
        if (!retval["success"])
        {
            error("ERROR: ", retval["errorMessage"]);
        }
        
        var config      = host.config();
        value = config.setVariable("mysqladmin", "user", ROOT_USER);
        value = config.setVariable("mysqladmin", "password", ROOT_PASSWORD);
        config.save();
        print(host.hostName() + ":" + host.port() + ": configured logrotate.");
            
        /* test it worked -*/
        /*
        cmd = "logrotate -vf /etc/logrotate.conf";
        retval = host.system(cmd);
        if (!retval["success"])
        {
            error("ERROR: ", retval["errorMessage"]);
        }
        */
    }
    return true;
}

