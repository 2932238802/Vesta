import paramiko
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("47.111.175.191", 22, "root", "!Lsj20041021", timeout=15, allow_agent=False, look_for_keys=False)
cmds = [
 "ss -lntp | head -30",
 "which nginx apache2 caddy httpd docker 2>/dev/null; systemctl list-units --type=service --state=running --no-pager | head -40",
 "nginx -v 2>&1; ls -la /var/www 2>/dev/null; ls -la /etc/nginx/sites-enabled 2>/dev/null; ls -la /etc/nginx/conf.d 2>/dev/null",
 "free -h; df -h /; nproc",
 "hostname -I; curl -s -m 5 ifconfig.me; echo",
]
for cmd in cmds:
    print("### " + cmd)
    _, o, e = c.exec_command(cmd, timeout=30)
    print(o.read().decode("utf-8","replace"))
    err = e.read().decode("utf-8","replace").strip()
    if err: print("ERR:", err[:400])
c.close()
