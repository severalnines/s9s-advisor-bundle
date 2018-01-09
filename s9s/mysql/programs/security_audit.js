#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

var DESCRIPTION="This advisor highlights any account that has been allowed to access the database with global host access and"
                " without password, allowing you to remove or patch the unsafe accounts and increase security.";
var TITLE="Security Audit - v0.2";

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
    
    print(TITLE);
    print("  ");
    print("Accounts allowing global access:");
    print("----------------------------------");
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];

        if (!connected)
            continue;
        ret = getValueMap(host, 
                      "SELECT User,Host FROM mysql.user WHERE host='%'");
        if (ret == false)
            print(host, ": No problem detected.");
        else
        {
            for(i=0; i<ret.size(); ++i)
            {
                print(host, ": '" + ret[i][0] +
                      "' is allowed to access from " + ret[i][1]) + ".";
            }
        }
        print("   ");
    }
    print("Accounts without password:");
    print("----------------------------------");
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];

        if (!connected)
            continue;
        if (isMySql57Host(host) || isMySql80Host(host))
        {
            ret = getValueMap(host, 
                              "SELECT User,Host FROM mysql.user WHERE authentication_string=''");
        }
        else
        {
            ret = getValueMap(host,
                              "SELECT User,Host FROM mysql.user WHERE password=''");
        }
        if (ret == false)
            print(host, ": No problem detected.");
        else
        {
            for(i=0; i<ret.size(); ++i)
            {
                print(host, ": '" + ret[i][0] + "'@'" + ret[i][1] + 
                      "' do not have a password set! Set the password or"
                      " drop this account!"
                      " You can also run mysql_secure_installation with STRICT"
                      " as argument to remove accounts with no password.");
            }
        }
        print("   ");
    }
    
    print("Accounts using hostname instead of IP:");
    print("----------------------------------");
    print("[D]DoS attacks can be mitigated using IPs instead of hostnames.");
    print(" ");
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];

        if (!connected)
            continue;
        ret = getValueMap(host, "SELECT User,Host FROM mysql.user");
        if (ret == false)
            print(host, ": No data found.");
        else
        {
            for(i=0; i<ret.size(); ++i)
            {
                if (!ret[i][1].toString().looksIpAddress() &&  
                   !(ret[i][1].toString() == "localhost" || 
                    (ret[i][1].toString() == "::1") ||
                     ret[i][1].toString().contains("%")))
                {
                    print(host, ": '" + ret[i][0] + "'@'" + ret[i][1] + 
                          "' is allowed to connect by hostname.");
                }
            }
        }
        print("   ");
    }
}
