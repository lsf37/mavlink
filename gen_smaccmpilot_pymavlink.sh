#!/bin/sh
python ./pymavlink/generator/mavgen.py \
	--lang=python \
	--wire-protocol=1.0 \
	--output=./pymavlink/mavlinkv10.py \
	./message_definitions/v1.0/smaccmpilot.xml
