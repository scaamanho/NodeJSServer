#!/bin/bash

#Create a Certificate Authority and a Server SSL Certificate
#Reference:
# http://greengeckodesign.com/blog/2013/06/15/creating-an-ssl-certificate-for-node-dot-js/
# http://bit.ly/15uTd6I

#Set ssl certificates directory
cd ../ssl

#Create a Certificate Authority
echo "Creating Certificate Authority..."
openssl genrsa -des3 -out ca.key 1024
openssl req -new -key ca.key -out ca.csr
openssl x509 -req -days 365 -in ca.csr -out ca.crt -signkey ca.key

#Create a Server SSL Certificate
echo "Creating Server Certificate"
openssl genrsa -des3 -out server.key 1024
openssl req -new -key server.key -out server.csr

#remove the passphrase from the server certificate
cp server.key server.key.org
openssl rsa -in server.key.org -out server.key
rm -f server.key.org

#generate your self-signed certificate
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
