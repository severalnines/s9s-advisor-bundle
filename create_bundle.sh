#!/bin/bash

dir=$1

if [ -z "$dir" ]; then 
   echo "Usage: ./create_bundle.sh  <directory>"
   echo "Output: <directory>.tar.gz"
fi 

if [ -d $dir ]; then
   tar cvfz `basename $dir`.tar.gz $dir
   if [ $? -eq 0 ]; then 
      echo "Created $dir.tar.gz"
      echo "Import the file:"
      echo "    `pwd`/$dir.tar.gz"
      echo "in the UI: Manage -> Developer Studio -> Import"
      exit 0
   else
      echo "Create bundle failed."
      exit 1
   fi
else
   echo "Directory $dir is not a valid directory"
   exit 1
fi


