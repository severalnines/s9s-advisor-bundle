
/**
 * a JS implementation of mysql_secure_installation
 */
 

function remove_anonymous_users(host)
{
    query = "DELETE FROM mysql.user where User=''";   
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
    query = "FLUSH PRIVILEGES";
    retval=host.executeSqlCommand(query);
    if (!retval["success"])
    {
        print("ERROR:", retval["errorMessage"]);
        return false;
    }
    return true;
}


function main()
{
    var hosts     = cluster::mySqlNodes();

    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host        = hosts[idx];
        map         = host.toMap();
        connected     = map["connected"];
        var advice = new CmonAdvice();

        if (!connected)
        {
            print("Instance " + 
                     host.hostName() + ":" +
                     host.port() + " is not online");
            continue;    
        }
        if (!remove_anonymous_users(host))
            print("Instance " + host.hostName() + ":" + host.port() + 
                  ": failed to remove empty users.");

        if (!remove_test_database(host))
            print("Instance " + host.hostName() + ":" + host.port() + 
                  ": failed to remove test database.");

        if (!reload_privilege_tables(host)) 
            print("Instance " + host.hostName() + ":" + host.port() + 
                  ": failed to relod privileges.");
        print("Instance " + host.hostName() + ":" + host.port() + 
              ": secured installation.");
    }
    return true;
}

