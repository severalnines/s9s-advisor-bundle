
/**
 * a JS implementation of mysql_secure_installation
 */
 
var DESCRIPTION="This advisor runs multiple checks and provides security recommendations based on mysql_secure_installation script.";
function remove_anonymous_users(host)
{
    print(host , ": Delete anonymous users.");
    query = "DELETE FROM mysql.user where User=''";   
    retval = host.executeSqlCommand(query);
    if (!retval["success"])
    {
        print("ERROR:", retval["errorMessage"]);
        return false;
    }
    return true;
}

function remove_users_without_password(host)
{
    print(host , ": Delete users with no password set.");
    query = "DELETE FROM mysql.user where Password=''";   
    retval = host.executeSqlCommand(query);
    if (!retval["success"])
    {
        print("ERROR:", retval["errorMessage"]);
        return false;
    }
    return true;
}

function remove_test_database(host)
{
    print(host , ": Dropping 'test' database (if exists).");
    query = "DROP DATABASE IF EXISTS test";    
    retval = host.executeSqlCommand(query);
    if (!retval["success"])
    {
        print("ERROR:", retval["errorMessage"]);
        return false;
    }
    query = "DELETE FROM mysql.db WHERE Db='test'";
    retval = host.executeSqlCommand(query);
    if (!retval["success"])
    {
        print("ERROR:", retval["errorMessage"]);
        return false;
    }
    return true;
}



function reload_privilege_tables(host)
{
    print(host , ": Reloading privileges.");
    query = "FLUSH PRIVILEGES";
    retval=host.executeSqlCommand(query);
    if (!retval["success"])
    {
        print("ERROR:", retval["errorMessage"]);
        return false;
    }
    return true;
}

/**
* Takes one arguemnt (optional).
* If "STRICT" is passed as the argument then accounts 
* lacking a password will be removed.
*/
function main(mode)
{
    var hosts     = cluster::mySqlNodes();

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();
        var error = false;
        if (!connected)
        {
            print("Instance " + 
                     host.hostName() + ":" +
                     host.port() + " is not online");
            continue;    
        }
        print("Securing instance " + host.hostName() + ":" + host.port());
        if (!remove_anonymous_users(host))
        {
            print("Instance " + host.hostName() + ":" + host.port() + 
                  ": failed to remove empty users.");
            error = true;
        }
        if (!remove_test_database(host))
        {
            print("Instance " + host.hostName() + ":" + host.port() + 
                  ": failed to remove test database.");
            error = true;
        }
        if(mode == "STRICT")
        {
            if (!remove_users_without_password(host))
            {
                print("Instance " + host.hostName() + ":" + host.port() + 
                      ": failed to relod privileges.");
                error = true;
            }
        }
        if (!reload_privilege_tables(host))
        {
            print("Instance " + host.hostName() + ":" + host.port() + 
                  ": failed to relod privileges.");
            error = true;
        }
        
        if(error)
            print("Instance " + host.hostName() + ":" + host.port() + 
              ": completed with errors. See above.");
        else
            print("Instance " + host.hostName() + ":" + host.port() + 
              ": secured installation.");
              
        print("======================================");
    }
    return true;
}


