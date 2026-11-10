import paramiko
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("47.111.175.191", 22, "root", "!Lsj20041021", timeout=15, allow_agent=False, look_for_keys=False)
for cmd in ["cat /etc/nginx/sites-available/index.conf", "ls -la /var/www/index /var/www/html | head -40", "cat /etc/nginx/nginx.conf | head -40"]:
    print("### " + cmd)
    _, o, e = c.exec_command(cmd, timeout=30)
    print(o.read().decode("utf-8","replace"))
c.close()
