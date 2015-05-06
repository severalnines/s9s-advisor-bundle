#include "cmon/alarms.h"

function readVariable(host1, myVar)
{

    query        = "SHOW GLOBAL VARIABLES LIKE '" + myVar +  "'";
    retval       = host1.executeSqlQuery(query);
    //
    // If the SQL query failed we print the error message
    // and return false.
    //
    if (!retval["success"])
    {
        print("ERROR: ", retval["errorMessage"]);
        return false;
    }
    //
    // Processing the results.
    //
    result = retval["result"];
    nRows  = result.rows();
    if (nRows==0)
        return false;
    var value;
    for (row = 0; row < nRows; ++row)
    {
        name  = result[row, 0];
        value = result[row, 1];
    }
    return value;
}

function getSingleValue(host1, query)
{

    retval       = host1.executeSqlQuery(query);
    //
    // If the SQL query failed we print the error message
    // and return false.
    //
    var value=0;

    if (!retval["success"])
    {
        print("ERROR: ", retval["errorMessage"]);
        return false;
    }
    //
    // Processing the results.
    //
    result = retval["result"];
    nRows  = result.rows();
    if (nRows==0)
        return false;
    print(nRows);
    for (row = 0; row < nRows; ++row)
    {
        value = result[row, 0];
    }
    return value;
}

function getValueMap(host1, query)
{

    retval       = host1.executeSqlQuery(query);
    //
    // If the SQL query failed we print the error message
    // and return false.
    //
    var value={};

    if (!retval["success"])
    {
        print("ERROR: ", retval["errorMessage"]);
        return false;
    }
    //
    // Processing the results.
    //
    result = retval["result"];
    nRows  = result.rows();
    if (nRows==0)
        return false;
    var columns = result.size();
    for (row = 0; row < nRows; ++row)
    {
        value[row] = {};
        for(c = 0; c < columns; ++c)
        {
            value[row][c] = result[row, c];
        }
    }
    return value;
}

function readStatusVariable(host, myVar)
{

    query        = "SHOW GLOBAL STATUS LIKE '" + myVar +  "'";
    retval       = host.executeSqlQuery(query);
    //
    // If the SQL query failed we print the error message
    // and return false.
    //
    if (!retval["success"])
    {
        print("ERROR: ", retval["errorMessage"]);
        return false;
    }

    //
    // Processing the results.
    //
    result = retval["result"];
    nRows  = result.rows();
    for (row = 0; row < nRows; ++row)
    {
        name  = result[row, 0];
        value = result[row, 1];
    }
    return value;
}

function executeSqlCommand(host, query)
{
    retval       = host.executeSqlCommand(query);
    //
    // If the SQL query failed we print the error message
    // and return false.
    //
    if (!retval["success"])
    {
        print("ERROR: ", retval["errorMessage"]);
        return false;
    }
    return true;
}

function checkPrecond(host)
{
    var UPTIME=3600;
    var QPS = 10;

    var uptime = readStatusVariable(host, "Uptime").toInt();
    var qps = readStatusVariable(host, "Queries").toInt() / uptime;

    if (uptime > UPTIME && qps > QPS)
        return true;
    else
        return false;
}

function setGlobalVariable(host, variable, value)
{
    query = "SET GLOBAL " + variable + "=" + value;
    return executeSqlCommand(host,query);
}

function mySleep(host, time)
{
    query = "SELECT SLEEP(" + time + ")";
    return executeSqlCommand(host,query);
}
