Video Talk
==========
This works only with Chrome 26.

The server is started as:
node t2userver.js

Set the IP address of the host on which t2userver.js is run as
serverAddr in both t2uclient.js and t2uprovider.js.

If you are using apache2 on ubuntu as your http server, copy the
following files to the /var/www directory (on Windows htdocs):
- t2uclient.js
- t2uprovider.js
- t2uclient.html
- t2uprovider.html
- common.css

To start the provider:
http://<ip address of http server>/t2uprovider.html
Grant permission to access camera and mic.
Click on Connect button.

To start the client:
http://<ip address of http server>/t2uclient.html
Grant permission to access camera and mic.
Click on Connect button.

A video session should get started between provider and client. To
terminate the session, click on the Hangup button. If terminated from
the client, the provider continues to be available. If terminated from
provider, both provider and client are disconnected. A provider should
be connected to the server before a client is connected.



