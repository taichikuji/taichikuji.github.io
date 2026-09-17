---
title: Get a DDNS up and running with DuckDNS - Step by Step
slug: get-a-ddns-up-and-running-with-duckdns
date: 2026-08-12
summary: A step-by-step guide to using DuckDNS and cron to keep a dynamic public IP mapped to a hostname.
tags:
  - ddns
  - duckdns
  - networking
draft: false
---

## Understanding DDNS

DDNS stands for Dynamic DNS. It updates a DNS name in real time so that it points to a changing IP address. This is useful for devices without a static IP.

Static IPs and IP ranges can be expensive. DDNS provides a cost-effective alternative by linking a hostname to a dynamic IP address.

## How DDNS works

To use DDNS, you need an account with a DDNS provider. A script or service on your device updates the DDNS provider with your current IP at regular intervals, keeping the hostname linked to the right address.

DuckDNS is free and relies on donations to keep its services running. If you find it useful, consider [supporting DuckDNS on Patreon](https://www.patreon.com/user?u=3209735).

## Setting up DuckDNS

1. **Create an account and log in.** Visit [DuckDNS](https://www.duckdns.org/) and log in or create an account.

   ![DuckDNS login page](https://i.imgur.com/8UbTQhw.png)

2. **Create a domain.** Once logged in, create a domain and link it to your current public IP.

   ![DuckDNS domain setup](https://i.imgur.com/xHg1ej6.png)

### Automating IP updates with a script

DuckDNS provides a simple script to keep your domain updated. You can follow their guide or continue with the steps below.

![DuckDNS update script](https://i.imgur.com/xDzWKUU.png)

1. **Ensure `crontab` is running:**

   ```bash
   ps -ef | grep cr[o]n
   ```

2. **Check that `curl` is installed:**

   ```bash
   curl --version
   ```

   If it is not installed on Ubuntu or Debian, install it with:

   ```bash
   sudo apt install curl -y
   ```

3. **Create a DuckDNS script.** Navigate to your home directory and create a `duckdns` folder:

   ```bash
   cd ~
   mkdir duckdns
   cd duckdns
   touch duck.sh
   ```

4. **Edit the script.** Open `duck.sh` with `nano` or your preferred editor and add:

   ```bash
   #!/bin/bash
   DOMAIN="EXAMPLE"
   TOKEN="TOKEN"
   echo url="https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=" | curl -o ~/duckdns/duck.log -K -
   ```

   Replace `EXAMPLE` with your DuckDNS domain and `TOKEN` with the unique token shown at the top of the DuckDNS dashboard.

5. **Set permissions and schedule the script.** Make it executable:

   ```bash
   chmod +x ~/duckdns/duck.sh
   ```

   Open the crontab editor:

   ```bash
   crontab -e
   ```

   Add this line to run the script every five minutes:

   ```bash
   */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
   ```

6. **Run the script manually for the first time:**

   ```bash
   cd ~/duckdns/
   ./duck.sh
   ```

   Check `duck.log`. If it contains `OK`, the setup succeeded. If it contains `KO`, review the domain, token, permissions, and command before continuing.

## Next steps

For example, you may want to set up port forwarding on your router to make effective use of the new DDNS hostname.
