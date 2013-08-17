#!/bin/sh

EXEC="python mavproxy.py --master=tcp:127.0.0.1:6200 --baud=57600"

echo $EXEC
$EXEC
