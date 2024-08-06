#
# Usage: generateKey.sh
#
# Generates private key for test cert
#

openssl req -x509 -nodes -newkey rsa -keyout server-key.pem -out server-cert.pem -days 3650 -subj "/C=CL/ST=RM/L=OpenTelemetryTest/O=Root/OU=Test/CN=ca"
