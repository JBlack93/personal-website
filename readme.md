# Website
First, a word of note: This is a work in progress. The previous iteration of this website, a wordpress site, suffered from a hardware failure. This has led to the development of this site, which is built with [Node.js](https://nodejs.org/en/), stored with [MongoDB](https://www.mongodb.com/), and deployed with [Apache2](https://httpd.apache.org/) and [Phusion Passenger](https://www.phusionpassenger.com/). It is built further with the use of many node modules, including [Express.js](https://expressjs.com/).

# Setting up this website
First, assuming a completely new Raspberry Pi system install (tested most recently with [Buster](https://www.raspberrypi.org/downloads/raspbian/), we need to set up the necessary tools. A complete guide for this is available [here](https://pimylifeup.com/node-red-raspberry-pi/), but a basic summary of the commands is below:

## Installation
We are going to use `nvm` (Node-Version-Manager). Which is an excellent tool.
```
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.35.2/install.sh | bash
nvm install node   # installs latest version of nodejs
nvm install-latest-npm   # Updates npm version to latest available
```

Use npm install. In turn use `sudo npm install <modulename>` for missing modules.


## Deploying

Passenger and Apache2 are used to deploy the website. This can be set up very easily. Apache2, installed as it usually would, and then the application itself placed in `/var/www/website`. The apache2 configuration file, `misc/jamesblack.ddns.net.conf` is then added to `/etc/apache2/sites-available/jamesblack.ddns.net.conf`. Then we enable some modules and the site itself:

```
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2ensite jamesblack.ddns.net
```

Note, that on raspbian buster the notes on how to install apache2 headers are incorrect in most versions of [passenger](https://github.com/phusion/passenger). This needs needs to be installed, and then `bin/passenger-install-apache2-module`.

```
apt_get_install "apache2-dev"
```

### Enforce https connections

```
sudo apt install python-certbot-apache
```
Next, we need to ensure that the https traffic is allowed through your firewall:

``
sudo ufw status
```
It will probably look like this, meaning that only HTTP traffic is allowed to the web server:

```
Output
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere                  
Apache                     ALLOW       Anywhere                  
OpenSSH (v6)               ALLOW       Anywhere (v6)             
Apache (v6)                ALLOW       Anywhere (v6)
```

To additionally let in HTTPS traffic, allow the Apache Full profile and delete the redundant Apache profile allowance:

```
sudo ufw allow 'Apache Full'
sudo ufw delete allow 'Apache'
```

If this fails, instead allow the ports individually:

```
sudo ufw allow http
sudo ufw allow https
sudo ufw allow ssh
```

Your status should now look like this:

```
sudo ufw status

Output
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere                  
Apache Full                ALLOW       Anywhere                  
OpenSSH (v6)               ALLOW       Anywhere (v6)             
Apache Full (v6)           ALLOW       Anywhere (v6)        

```

or:

```
Status: active

To                         Action      From
--                         ------      ----
80/tcp                     ALLOW       Anywhere                  
443/tcp                    ALLOW       Anywhere                  
22/tcp                     ALLOW       Anywhere                  
80/tcp (v6)                ALLOW       Anywhere (v6)             
443/tcp (v6)               ALLOW       Anywhere (v6)             
22/tcp (v6)                ALLOW       Anywhere (v6)             
```

Now, we can generate the certificate.
```
sudo certbot certonly 
```

Select Option 2 (by webroot). Enter the domain: `jamesblack.ddns.net`. Enter the webroot (which, to match apache2: `/var/www/website/public`.

Now we have a fully encrypted connection which is allowed over https. 

## Installing MongoDB

We need mongodb. The code below will install the relevant dependencies and pull the source code. First, update.

```
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install wget
```
Then we install some dependencies:
```
sudo apt install scons build-essential
sudo apt install libboost-filesystem-dev libboost-program-options-dev libboost-system-dev libboost-thread-dev
sudo apt install python-pymongo

```
Next, some python module dependencies, needed by scons:
```
pip install --user Cheetah
pip install --user typing
pip install --user pyyaml
```

Next, we look into pulling the mongodb source code, and the the arm specific options:

```
mkdir ~/install
cd ~/install
wget https://fastdl.mongodb.org/src/mongodb-src-r3.2.12.tar.gz
tar xvf mongodb-src-r3.2.12.tar.gz
cd mongodb-src-r3.2.12

cd src/third_party/mozjs-45/
./get_sources.sh
./gen-config.sh arm linux
cd -

```
A word of caution, if you are using a version of gcc > 6 you will need to add the following to `src/mongo/db/storage/mmap_v1/mmap_v1_engine.cpp`:

```
#include <sys/sysmacros.h>
```
since this is no longer included by other system includes.

In fact, I have found it necessary to compile with a version of gcc as late as 9.1 although it is possible that this is unecessary. This can be done relatively pain free with the script included in this repo. 
```
./misc/installgcc.sh
```
Will install gcc version 9.1 for us. On a raspberry pi 4 (4GB) this took 3+hours on the previous install. Leave overnight.


Now, to actually install mongodb in a streamlined capacity so as not to overwhelm the raspberry pi:
```
scons mongo mongod --wiredtiger=off --mmapv1=on --disable-warnings-as-errors
```
Following this, on my most recent install the old gcc library `/usr/lib/arm-linux-gnueabihf/libstdc++.so.6` had to be symbolically linked to the gcc 9.1 version library: `/usr/local/lib/libstdc++.so.6`.

## Later versions
We can attempt to install a later version, but the 32-bit OS, which raspian buster is, severely limits what we can acheive. Below, we can see basic steps that may need to be taken for `mongodb-src-r3.3.15.tar.gz`. Note, this last part is the reason why we cannot download and install a later version of mongodb using this method: for later releases, `arm` processor type is not defined for `gen-config.sh`.

It seems we may need to follow [this post](https://pansila.github.io/posts/ae66dec5/) in order to get anywhere with the mongodb install. That is, we will need to ensure that this version of mongodb can be compiled by an arm processor:

One thing we note, is that when we compile later, without the following step, we get an error for a header file which is not found. We need to compile this header with the following:
```
wget https://github.com/gperftools/gperftools/releases/download/gperftools-2.5/gperftools-2.5.tar.gz
tar xf gperftools-2.5.tar.gz
cd gperftools-2.5
./configure --host=arm-linux --build=x86_64-linux
```
And copy `src/config.h` to `mongodb[..]/src/src/third_party/gperftools-2.5/build_linux_arm/. Next, we need to ensure that arm is allowed as a processor. So, we alter `src/mongo/platform/pause.h` with:

```
#elif defined(__aarch64) || defined(__arm__)

#define MONGO_YIELD_CORE_FOR_SMT() __asm__ volatile("yield" ::: "memory")
```
The additional information of what to do for the case of an arm processor. Further, we need to alter the SConstruct mongodb to use gnu++14, rather than c++11:
```
if not AddToCXXFLAGSIfSupported(myenv, '-std=gnu++14'):
   myenv.ConfError('Compiler does not honor -std=gnu++14')
```

Finally, we need to change the second argument of all calls to `appendNumber()` from `uint64_t`, to `long long` for all existing calls. This is most easily acheived with a `static_cast<long long>()` for each case in turn (there are ~6 in `src/mongo/util/procparser.cpp`.

See the post listed above for further steps if necessary. The above was sufficient for a raspberry pi 4 running buster (debian 10).

Now, to actually install mongodb in a streamlined capacity so as not to overwhelm the raspberry pi:
```
scons mongo mongod --wiredtiger=off --mmapv1=on --disable-warnings-as-errors
```
This should take a few hours. Note the disabled warnings as errors flag. This is necessary, since raspbian buster boost libraries appear to have some small syntax issues (which have no real effect). This is a problem for Boost1.56-1.60 (at least, probably more. 

After all this, we should have an installed version of MongoDB which works.

We can now strip the binaries so as to save a lot of space:
```
strip -s build/opt/mongo/mongo
strip -s build/opt/mongo/mongod
```

Finally, copy the binaries to a location within your `PATH`, eg:
```
sudo cp mongo mongod /usr/local/bin/
```

Now, a test with `mongo`:
```
$ mongo
MongoDB shell version: 3.2.12
connecting to: test
Server has startup warnings: 
Mon May 11 22:48:47.822 [initandlisten] 
Mon May 11 22:48:47.822 [initandlisten] ** NOTE: This is a 32 bit MongoDB binary.
Mon May 11 22:48:47.822 [initandlisten] **       32 bit builds are limited to less than 2GB of data (or less with --journal).
Mon May 11 22:48:47.822 [initandlisten] **       See http://dochub.mongodb.org/core/32bit
Mon May 11 22:48:47.822 [initandlisten] 
> ^C
bye

```
We can now start the database service. You'll likely need to first use this database as :
```
sudo mongod --storageEngine=mmapv1 
```
Since we only have this supported (raspbian is only 32bit). Further, you may have to create the directory `/data/db`, or specify where you want the database to be kept. 

Finally, we can start our services: 
```
sudo service mongodb start
sudo service apache2 start
```
If you have the appropriate port-forwarding set up and the DNS set up as it should be (see [noip](www.noip.com)), then the webpage should come live at `https://jamesblack.ddns.net`
