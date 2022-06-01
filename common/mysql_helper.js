#include "cmon/alarms.h"

function readVariable(host1, myVar)
{

    _query        = "SHOW GLOBAL VARIABLES LIKE '" + myVar +  "'";
    retval       = host1.executeSqlQuery(_query);
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

function getSingleValue(host1, _query)
{

    retval       = host1.executeSqlQuery(_query);
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
    for (row = 0; row < nRows; ++row)
    {
        value = result[row, 0];
    }
    return value;
}

function getResultSet(host1, _query)
{
    retval       = host1.executeSqlQuery(_query);
    return retval;
}

function getValueMap(host1, _query)
{

    retval       = host1.executeSqlQuery(_query);
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

    _query        = "SHOW GLOBAL STATUS LIKE '" + myVar +  "'";
    retval       = host.executeSqlQuery(_query);
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

function executeSqlCommand(host, _query)
{
    retval       = host.executeSqlCommand(_query);
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


function executeSqlCommand2(host, _query)
{
    retval       = host.executeSqlCommand(_query);
    return retval; 
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
    if (value.looksInteger() || value.looksULongLong() || value.looksDouble())
        _query = "SET GLOBAL " + variable + "=" + value;
    else
        _query = "SET GLOBAL " + variable + "='" + value + "'";
    
    return executeSqlCommand2(host,_query);
}

function mySleep(host, time)
{
    _query = "SELECT SLEEP(" + time + ")";
    return executeSqlCommand(host, _query);
}

function isSystemTable(value) {
    if (value == "performance_schema" ||
        value == "information_schema" ||
        value == "mysql" ||
        value == "sys")
        return true;
    return false;
}
